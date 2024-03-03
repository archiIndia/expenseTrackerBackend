const DEFAULT_LIMIT = 10;
const ExpenseModel = require("../Models/expensemodel");
const moment = require("moment");
const calBalAndExpense = (inc, exp_list) => {
  let totalExpense = 0;
  for (let exp of exp_list) {
    totalExpense += exp.amount;
  }
  const balance = inc - totalExpense;
  return { totalExpense, balance };
};

const createExpense = async (req, res) => {
  const income_val = Number(req.body.income);
  const exp_list = req.body.exp_list.filter(
    (item) => item.item_name.length > 0
  );
  const date = req.body.date;
  const { balance, totalExpense } = calBalAndExpense(income_val, exp_list);
  const userId = req.userInfo.userId;

  try {
    const newExpense = await ExpenseModel.create({
      userId: userId,
      income: income_val,
      expenseTotal: totalExpense,
      itemList: exp_list,
      balance: balance,
      date: date,
      status: "A",
    });
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(400).json(error);
  }
};

const findExpense = async (req, res) => {
  try {
    const userId = req.userInfo.userId;
    const { page = 1 } = req.query;
    const pageNum = parseInt(page);
    const skipNum = (pageNum - 1) * DEFAULT_LIMIT; //1->0,3->12,5->24
    const data = await ExpenseModel.find({ status: "A", userId: userId })
      .sort("_id")
      .limit(DEFAULT_LIMIT)
      .skip(skipNum);
    res.status(202).json(data);
  } catch (error) {
    res.status(404).json(error);
  }
};

const deleteExpense = async (req, res) => {
  try {
    const userId = req.userInfo.userId;
    const del = req.params.delid;
    const delExp = await ExpenseModel.findOneAndUpdate(
      { _id: del, status: "A", userId: userId },
      { status: "D" },
      { new: true }
    );
    res.status(201).json(delExp);
  } catch (error) {
    res.status(404).json(error);
  }
};

const getOneExpense = async (req, res) => {
  try {
    const userId = req.userInfo.userId;
    const findId = req.params.find_id;
    const singleExpense = await ExpenseModel.findOne({
      _id: findId,
      status: "A",
      userId: userId,
    });
    // console.log(singleExpense);
    res.status(200).json(singleExpense);
  } catch (err) {
    res.status(404).json(err);
  }
};

const updateExpense = async (req, res) => {
  try {
    const findId = req.params.find_id;
    const income_val = Number(req.body.income);
    const exp_list = req.body.exp_list;
    const date = req.body.date;
    const { balance, totalExpense } = calBalAndExpense(income_val, exp_list);
    const userId = req.userInfo.userId;

    const updated = await ExpenseModel.findOneAndUpdate(
      { _id: findId, userId: userId },
      {
        income: income_val,
        expenseTotal: totalExpense,
        itemList: exp_list,
        date: date,
        balance: balance,
      },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (error) {
    res.status(404).json(error);
  }
};

const getTopExpenses = async (req, res) => {
  try {
    const userId = req.userInfo.userId;
    const { is_monthly = false } = req.query;
    const isMonthly = (is_monthly==="true" ? true : false);

    // i need to create the match stage on the fly
    // when "isMonthly" is true, then we also add "date" filter

    const matchStage = {
      status: "A",
      userId: userId,
    };
    console.log("isMonthly",isMonthly)

    // if is monthly is true then we execute the following block
    if (isMonthly) {
      const first_day_of_month = moment().startOf("month").toDate();
      const last_day_of_month = moment().endOf("month").toDate();
      // now we add a date filter in the "matchStage"
      matchStage["date"] = {
        // we only want data from start of this month
        $gte: first_day_of_month,
        // to end of this month
        $lte: last_day_of_month,
        // note: get only those record whose date is in between "first_day_of_month" and "last_day_of_month"
      };
    }
    console.log("m stage", matchStage);
    const result = await ExpenseModel.aggregate([
      //stage 1
      {
        $match: matchStage,
      },
      {
        $project: {
          itemList: 1, //Only selecting ItemList
        },
      },
      {
        $unwind: {
          path: "$itemList",
        },
      },
      {
        $group: {
          _id: "$itemList.item_name",
          total_expense: { $sum: "$itemList.amount" },
          item_name: { $first: "$itemList.item_name" },
        },
      },
      {
        $project: {
          _id: 0, // Unselect _id;
        },
      },
      {
        $sort: {
          total_expense: -1,
          item_name: 1,
        },
      },
      {
        $limit: 5,
      },
    ]);
    res.status(200).json({ top_expenses: result });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};

module.exports = {
  createExpense,
  findExpense,
  deleteExpense,
  getOneExpense,
  updateExpense,
  getTopExpenses,
};
