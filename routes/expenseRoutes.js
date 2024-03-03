const { Router } = require("express");
const exp = Router();
const {
  createExpense,
  findExpense,
  deleteExpense,
  getOneExpense,
  updateExpense,
  getTopExpenses,
} = require("./../Controller/expenseController");

exp
  .delete("/del/:delid", deleteExpense)
  .get("/getall", findExpense)
  .get("/top_expenses", getTopExpenses)
  .get("/:find_id", getOneExpense)
  .put("/:find_id", updateExpense)
  .post("/", createExpense);

module.exports = exp;
