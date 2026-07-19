const GetUser = async (req, res) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({
        message: "User is not authenticated",
        status: false,
        data: null,
      });
    }

    const user = req.user.toJSON ? req.user.toJSON() : req.user;
    return res.status(200).json({
      message: "Got User Details",
      status: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to find User", status: false });
  }
};

export default GetUser;
