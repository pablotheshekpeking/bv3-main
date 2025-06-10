export const updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken }
    });

    res.json({ message: 'FCM token updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 