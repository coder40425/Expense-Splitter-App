import express from "express";
import Expense from "../models/Expense.js";
import Group from "../models/Group.js";
import protect from "../middleware/authMiddleware.js";
import { io } from "../server.js"; // or use req.app.get('io') if preferred

const router = express.Router();

/**
 * Add expense to a group
 * POST /api/expenses/:groupId
 */
router.post("/:groupId", protect, async (req, res) => {
  try {
    const { description, amount, splitAmong } = req.body;

    if (!splitAmong || !Array.isArray(splitAmong) || splitAmong.length === 0) {
      return res.status(400).json({ message: "splitAmong must be a non-empty array of member IDs" });
    }

    const payer = req.user._id.toString();

    // Include payer if not in splitAmong
    const finalSplit = splitAmong.includes(payer) ? splitAmong : [...splitAmong, payer];

    const individualShare = parseFloat((amount / finalSplit.length).toFixed(2)); // round to 2 decimals

    const expense = await Expense.create({
      description,
      amount,
      paidBy: payer,
      group: req.params.groupId,
      splitAmong: finalSplit,
      individualShare
    });

    await Group.findByIdAndUpdate(req.params.groupId, {
      $push: { expenses: expense._id }
    });

    io.to(`group_${req.params.groupId}`).emit("expenseAdded", {
      ...expense.toObject(),
      createdAt: new Date().toISOString()
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;