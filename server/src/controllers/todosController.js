const ToDo = require('../models/ToDo');

const getTodos = async (req, res) => {
  const { devId } = req.params;

  // Auth: self or role >= 2
  if (req.user.id !== devId && req.user.role < 2) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const todos = await ToDo.find({ devId }).sort({ createdAt: -1 }).lean();

  // Group by mockupId
  const grouped = todos.reduce((acc, todo) => {
    const key = todo.mockupId?.toString() || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(todo);
    return acc;
  }, {});

  return res.json({ devId, todos, grouped });
};

const updateTodo = async (req, res) => {
  const { todoId } = req.params;
  const { status } = req.body;

  if (!['open', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "open" or "done"' });
  }

  const todo = await ToDo.findById(todoId);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  // Auth: self only
  if (todo.devId.toString() !== req.user.id && req.user.role < 3) {
    return res.status(403).json({ error: 'Can only update your own todos' });
  }

  todo.status = status;
  if (status === 'done') todo.completedAt = new Date();
  else todo.completedAt = null;
  await todo.save();

  return res.json({ success: true, todo });
};

const createTodos = async (devId, mockupId, tasks) => {
  const docs = tasks.map((task) => ({ devId, mockupId, task, status: 'open' }));
  return await ToDo.insertMany(docs);
};

const getAllTodos = async (req, res) => {
  // L3 aggregate view
  const todos = await ToDo.find().populate('devId', 'email role').sort({ createdAt: -1 }).lean();
  return res.json({ todos });
};

module.exports = { getTodos, updateTodo, createTodos, getAllTodos };
