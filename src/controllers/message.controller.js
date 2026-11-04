import Message from "../models/message";

export const getMessages = async (req, res) => {
  try {
    const { userId, destinatarioId } = req.query;
    let query = {};

    if (!destinatarioId || destinatarioId === "gen") {
      query = { destinatario: null };
    } else {
      query = {
        $or: [
          { remitente: userId, destinatario: destinatarioId },
          { remitente: destinatarioId, destinatario: userId },
        ],
      };
    }

    // Añadimos .populate para traer el nombre y apellido del usuario
    const messages = await Message.find(query)
      .populate("remitente", "nombres apellidos")
      .sort({ createdAt: 1 });
      
    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el historial de mensajes" });
  }
};