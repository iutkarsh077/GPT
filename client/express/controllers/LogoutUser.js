const Logout = async (req, res) => {
  const clearSessionCookie = () => {
    res.clearCookie("connect.sid", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  };

  req.logout((error) => {
    if (error) {
      return res.status(500).json({
        message: "Failed to logout user",
        status: false,
      });
    }

    req.session.destroy((sessionError) => {
      clearSessionCookie();

      if (sessionError) {
        return res.status(500).json({
          message: "Failed to clear session",
          status: false,
        });
      }

      return res.status(200).json({
        message: "User logout successfully",
        status: true,
      });
    });
  });
};

export default Logout;
