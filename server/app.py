from dotenv import load_dotenv
from fastapi import FastAPI
from openai import AsyncOpenAI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_openai import OpenAIEmbeddings
import os
import asyncio
from io import BytesIO
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient, models
from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client.models import PayloadSchemaType, VectorParams, Distance
from constant import llm_instructions
from github_agent import run_github_code_agent
from pypdf import PdfReader
import boto3

load_dotenv()

app = FastAPI()

class LatestChat(BaseModel):
    query: str
    content: str 

class QueryRequest(BaseModel):
    query: str
    user_id: str
    user_info: dict
    chat_id: str
    chat_title: str
    latestChats: List[LatestChat] = Field(default_factory=list)
    github_access_token: str | None = None
    github_username: str | None = None


class EmbedFileRequest(BaseModel):
    key: str
    user_id: str
    chat_id: str

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

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_KEY"),
    region_name=os.environ.get("AWS_REGION_NAME")
)

COLLECTION_NAME = "chat_collection"
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)


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

    for field_name in ("metadata.user_id", "metadata.chat_id", "metadata.s3_key"):
        try:
            qdrant.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field_name,
                field_schema=PayloadSchemaType.KEYWORD
            )
        except Exception:
            pass

    print("Indexes ensured")

setup_qdrant()


vector_store = QdrantVectorStore(
    client=qdrant,
    collection_name=COLLECTION_NAME,
    embedding=embeddings
)


def chat_scope_filter(user_id: str, chat_id: str) -> models.Filter:
    return models.Filter(
        must=[
            models.FieldCondition(
                key="metadata.user_id",
                match=models.MatchValue(value=user_id),
            ),
            models.FieldCondition(
                key="metadata.chat_id",
                match=models.MatchValue(value=chat_id),
            ),
        ]
    )


def build_pdf_documents(file_bytes: bytes, user_id: str, chat_id: str, s3_key: str) -> list[Document]:
    reader = PdfReader(BytesIO(file_bytes))
    page_docs: list[Document] = []

    for page_index, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if not text:
            continue
        page_docs.append(
            Document(
                page_content=text,
                metadata={
                    "user_id": user_id,
                    "chat_id": chat_id,
                    "s3_key": s3_key,
                    "role": "file",
                    "page": page_index + 1,
                },
            )
        )

    if not page_docs:
        raise ValueError("No extractable text found in PDF")

    chunks = text_splitter.split_documents(page_docs)
    for index, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = index

    return chunks


def ingest_pdf_from_s3(key: str, user_id: str, chat_id: str) -> int:
    response = s3.get_object(Bucket=os.environ.get("AWS_BUCKET_NAME"), Key=key)
    file_bytes = response["Body"].read()
    chunks = build_pdf_documents(file_bytes, user_id, chat_id, key)
    vector_store.add_documents(chunks)
    return len(chunks)


@app.get("/health")
def health_check():
    return {"message": "Health is Fine", "status": True}


async def GetChatTitleSuggestion(query: str, content: str):
    result = await client.responses.create(
        model="gpt-5.4-mini",
        instructions=(
            "Generate a chat title using ONLY 2 or 3 words taken EXACTLY from the user query. "
            "Do NOT add new words."
        ),
        input=f"""
        User query:
        {query}

        Assistant response:
        {content}
        """
    )
    return result.output_text.strip()[0:10]


@app.post("/embed-file")
async def EmbedFile(request: EmbedFileRequest):
    try:
        chunk_count = await asyncio.to_thread(
            ingest_pdf_from_s3,
            request.key,
            request.user_id,
            request.chat_id,
        )
        return {
            "status": True,
            "message": "File embedded successfully",
            "chunks": chunk_count,
        }
    except Exception as e:
        print(e)
        return {
            "status": False,
            "message": "Failed to embed file",
        }

@app.post("/query")
async def QueryUserQuestions(request: QueryRequest):
    results = await asyncio.to_thread(
        lambda: vector_store.similarity_search(
            query=request.query,
            k=5,
            filter=chat_scope_filter(request.user_id, request.chat_id),
        )
    )

    retrieved_context = "\n\n".join(
        [
            f"[page {doc.metadata.get('page', '?')}] {doc.page_content}"
            if doc.metadata.get("role") == "file"
            else doc.page_content
            for doc in results
        ]
    )

    latest_chat_context = "\n\n".join([
        f"User: {chat.query}\nAssistant: {chat.content}"
        for chat in request.latestChats
    ])

    if request.github_access_token:
        answer = await run_github_code_agent(
            query=request.query,
            github_token=request.github_access_token,
            username=request.github_username,
            user_info=request.user_info,
            retrieved_context=retrieved_context,
            latest_chat_context=latest_chat_context,
        )
    else:
        response = await client.responses.create(
            model="gpt-5.4-mini",
            instructions=llm_instructions,
            input=f"""
            User information:
            {request.user_info}

            Retrieved document context:
            {retrieved_context or "No relevant document context found."}

            Latest conversation history:
            {latest_chat_context or "No previous conversation history."}

            Current user question:
            {request.query}

            Prefer the retrieved document context when it is relevant to the question.
            """
        )
        answer = response.output_text

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
            page_content=f"Assistant: {answer}",
            metadata={
                "user_id": request.user_id,
                "chat_id": request.chat_id,
                "role": "assistant"
            }
        )
    ]

    title = request.chat_title
    if title == "New Chat":
        title = await GetChatTitleSuggestion(request.query, answer)

    await asyncio.to_thread(vector_store.add_documents, docs)

    return {
        "status": True,
        "data": answer,
        "chat_title": title
    }