from dotenv import load_dotenv
from fastapi import FastAPI
from openai import AsyncOpenAI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_openai import OpenAIEmbeddings
import os
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient, models
from typing import List
from langchain_core.documents import Document
from qdrant_client.models import PayloadSchemaType, VectorParams, Distance
from constant import llm_instructions

load_dotenv()

app = FastAPI()

class LatestChat(BaseModel):
    query: str
    content: str 

class QueryRequest(BaseModel):
    query: str
    user_id: str
    chat_id: str
    chat_title: str
    latestChats: List[LatestChat] = Field(default_factory=list)

NODEJS_BACKEND_URI = os.environ.get("NODEJS_BACKEND_URI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[NODEJS_BACKEND_URI],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)


client = AsyncOpenAI()
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

qdrant = QdrantClient(
    url=os.environ.get("QDRANT_URL"),
    api_key=os.environ.get("QDRANT_API_KEY")
)

COLLECTION_NAME = "chat_collection"


def setup_qdrant():
    collections = [c.name for c in qdrant.get_collections().collections]

    if COLLECTION_NAME not in collections:
        print("Creating collection...")
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=3072, 
                distance=Distance.COSINE
            )
        )

    try:
        qdrant.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="user_id",
            field_schema=PayloadSchemaType.KEYWORD
        )

        qdrant.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="chat_id",
            field_schema=PayloadSchemaType.KEYWORD
        )

        print("Indexes ensured")
    except Exception as e:
        print("Index already exists or skipped")

setup_qdrant()


vector_store = QdrantVectorStore(
    client=qdrant,
    collection_name=COLLECTION_NAME,
    embedding=embeddings
)


@app.get("/health")
def health_check():
    return {"message": "Health is Fine", "status": True}


async def GetChatTitleSuggestion(query: str):
    result = await client.responses.create(
        model="gpt-4.1",
        instructions=(
            "Generate a chat title using ONLY 2 or 3 words taken EXACTLY from the user query. "
            "Do NOT add new words."
        ),
        input=query
    )
    return result.output_text.strip()


@app.post("/query")
async def QueryUserQuestions(request: QueryRequest):

    results = vector_store.similarity_search(
        query=request.query,
        limit=5,
        filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="user_id",
                    match=models.MatchValue(value=request.user_id)
                ),
                models.FieldCondition(
                    key="chat_id",
                    match=models.MatchValue(value=request.chat_id)
                )
            ]
        )
    )

    retrieved_context = "\n\n".join([doc.page_content for doc in results])

    latest_chat_context = "\n\n".join([
        f"User: {chat.query}\nAssistant: {chat.content}"
        for chat in request.latestChats
    ])

    response = await client.responses.create(
        model="gpt-4.1",
        instructions=llm_instructions,
        input=f"""
        Relevant retrieved conversation context:
        {retrieved_context or "No relevant retrieved context found."}

        Latest conversation history:
        {latest_chat_context or "No previous conversation history."}

        Current user question:
        {request.query}
        """
            )

    title = request.chat_title
    if title == "New Chat":
        title = await GetChatTitleSuggestion(request.query)

    docs = [
        Document(
            page_content=f"User: {request.query}",
            metadata={
                "user_id": request.user_id,
                "chat_id": request.chat_id,
                "role": "user"
            }
        ),
        Document(
            page_content=f"Assistant: {response.output_text}",
            metadata={
                "user_id": request.user_id,
                "chat_id": request.chat_id,
                "role": "assistant"
            }
        )
    ]

    vector_store.add_documents(docs)

    return {
        "status": True,
        "data": response.output_text,
        "chat_title": title
    }