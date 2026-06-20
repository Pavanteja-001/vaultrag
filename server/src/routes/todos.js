const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getTodos, updateTodo, getAllTodos } = require('../controllers/todosController');

router.get('/all', authenticate, requireRole(3), getAllTodos);
router.get('/:devId', authenticate, getTodos);
router.patch('/:todoId', authenticate, updateTodo);

module.exports = router;
