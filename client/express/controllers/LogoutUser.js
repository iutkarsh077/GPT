const Logout = async (req, res) => {
  req.logout((error) => {
    if (error) {
      return res.status(500).json({
        message: "Failed to logout user",
        status: false,
      });
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        return res.status(500).json({
          message: "Failed to clear session",
          status: false,
        });
      }

      res.clearCookie("connect.sid");
      return res.status(200).json({
        message: "User logout successfully",
        status: true,
      });
    });
  });
};

export default Logout