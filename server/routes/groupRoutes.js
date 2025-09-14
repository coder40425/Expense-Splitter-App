import express from "express";
import Group from "../models/Group.js";
import User from "../models/User.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE GROUP
router.post("/", protect, async (req, res) => {
  try {
    const { name, members = [] } = req.body;

    const group = await Group.create({
      name,
      members: [...members, req.user._id],
      createdBy: req.user._id,
    });

    res.status(201).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET GROUPS OF LOGGED-IN USER
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name email");
    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET SINGLE GROUP WITH BALANCES
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name email")
      .populate({
        path: "expenses",
        populate: { path: "paidBy", select: "name email" },
      })
      .populate({
        path: "messages.sender",
        select: "name email"
      });

    if (!group) return res.status(404).json({ message: "Group not found" });

    // Ensure user is a member
    if (!group.members.some((m) => m._id.equals(req.user._id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Calculate balances
    const balances = {};
    group.members.forEach((m) => (balances[m._id] = 0));

    group.expenses.forEach((expense) => {
      const splitAmount = expense.amount / expense.splitAmong.length;
      expense.splitAmong.forEach((userId) => {
        if (userId.toString() === expense.paidBy._id.toString()) return;
        balances[userId] += splitAmount; // this user owes
        balances[expense.paidBy._id] -= splitAmount; // payer is owed
      });
    });

    res.json({ ...group.toObject(), balances });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ===== NEW: CHAT MESSAGE ROUTES =====

// SEND MESSAGE
router.post("/:id/messages", protect, async (req, res) => {
  try {
    const { content } = req.body;
    const groupId = req.params.id;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check if user is member
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    // Create message object
    const message = {
      sender: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    };

    // Add message to group
    group.messages.push(message);
    await group.save();

    // Populate sender info for the response
    await group.populate({
      path: "messages.sender",
      select: "name email"
    });

    // Get the newly added message
    const newMessage = group.messages[group.messages.length - 1];

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('newMessage', {
        _id: newMessage._id,
        content: newMessage.content,
        sender: {
          _id: newMessage.sender._id,
          name: newMessage.sender.name,
          email: newMessage.sender.email
        },
        createdAt: newMessage.createdAt,
        // Legacy format for compatibility with existing frontend
        user: newMessage.sender.name || newMessage.sender.email,
        userId: newMessage.sender._id.toString(),
        message: newMessage.content,
        time: newMessage.createdAt.toISOString()
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// GET MESSAGES FOR A GROUP
router.get("/:id/messages", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate({
        path: "messages.sender",
        select: "name email"
      });

    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check if user is member
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    res.json(group.messages || []);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// ===== END MESSAGE ROUTES =====

// ADD MEMBER – ANYONE IN GROUP CAN ADD
router.post("/:id/members", protect, async (req, res) => {
  try {
    const { email, name } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: "You are not in this group" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      if (!group.members.includes(existingUser._id)) {
        group.members.push(existingUser._id);
      } else {
        return res.status(400).json({ message: "User is already a member" });
      }
    } else {
      const alreadyInvited = group.emailInvites.some(
        (invite) => invite.email === email.toLowerCase()
      );
      if (alreadyInvited)
        return res.status(400).json({ message: "User is already invited" });

      group.emailInvites.push({
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
      });
    }

    await group.save();
    res.status(200).json({
      message: existingUser ? "Member added successfully" : "Invitation sent",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// REMOVE MEMBER – ONLY CREATOR
router.delete("/:id/members/:memberEmail", protect, async (req, res) => {
  try {
    const { id: groupId, memberEmail } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only creator can remove members" });
    }

    const userToRemove = await User.findOne({ email: memberEmail });
    if (userToRemove) {
      group.members = group.members.filter(
        (m) => m.toString() !== userToRemove._id.toString()
      );
    }
    group.emailInvites = group.emailInvites.filter(
      (invite) => invite.email !== memberEmail
    );

    await group.save();
    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// CANCEL INVITE
router.delete("/:id/invites/:email", protect, async (req, res) => {
  try {
    const { id: groupId, email } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only creator can cancel invites" });
    }

    group.emailInvites = group.emailInvites.filter(
      (invite) => invite.email !== decodeURIComponent(email)
    );

    await group.save();
    res.json({ message: "Invite cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// LEAVE GROUP – ANY MEMBER CAN LEAVE
router.post("/:id/leave", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter(
      (m) => m.toString() !== req.user._id.toString()
    );
    await group.save();

    res.json({ message: "You left the group successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE GROUP – ONLY CREATOR
router.delete("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only creator can delete the group" });
    }

    await group.deleteOne();
    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
