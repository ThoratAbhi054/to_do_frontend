/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import {
    Box,
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    AppBar,
    Toolbar,
    Checkbox,
    Divider,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useTheme,
    alpha,
    CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';

interface Todo {
    id: number;
    title: string;
    description: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    deadline: string;
    category: string;
    user: string;
}

interface Categories {
    id:string;
    name: string;
    user: string;
}

interface TodoFormData {
    title: string;
    description: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    deadline: string;
    category: string;
}

const BASE_URL = 'http://192.168.23.93:8000';

export default function Dashboard() {
    const { isAuthenticated, loading, logout, user, fetchWithTokenRefresh } = useAuth();
    const router = useRouter();
    const theme = useTheme();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Categories[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [categoryLoading, setCategoryLoading] = useState(false);

    // Initialize form data
    const [formData, setFormData] = useState<TodoFormData>({
        title: '',
        description: '',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        deadline: '',
        category: '',
    });

    // Add state for editing
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

    // Fetch todos on component mount
    useEffect(() => {
        if (!loading && isAuthenticated) {
            fetchTodos();
            fetchCategories();
        }
    }, [loading, isAuthenticated]);

    const fetchTodos = async () => {
        try {
            const response = await fetchWithTokenRefresh(`${BASE_URL}/todo/tasks/`);
            
            if (response.ok) {
                const data = await response.json();
                setTodos(data);
            } else {
                console.error('Failed to fetch todos:', response.status);
                if (response.status === 401) {
                    logout();
                }
            }
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetchWithTokenRefresh(`${BASE_URL}/todo/categories/`);
            
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            } else {
                console.error('Failed to fetch categories:', response.status);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // Handle form input changes
    const handleFormChange = (field: keyof TodoFormData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle adding new todo
    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetchWithTokenRefresh(`${BASE_URL}/todo/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    user: user?.id,
                    category: categories.find(cat => cat.name === formData.category)?.id,
                }),
            });

            if (response.ok) {
                await fetchTodos();
                setFormData({
                    title: '',
                    description: '',
                    status: 'IN_PROGRESS',
                    priority: 'MEDIUM',
                    deadline: '',
                    category: '',
                });
            } else {
                console.error('Failed to add todo:', response.status);
                const errorData = await response.json();
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error adding todo:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleTodo = async (id: number) => {
        try {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;

            const token = localStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/todo/tasks/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    ...todo,
                    status: todo.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED',
                }),
            });

            if (response.ok) {
                await fetchTodos();
            } else {
                console.error('Failed to update todo:', response.status);
            }
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    };

    const handleDeleteTodo = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/todo/tasks/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                await fetchTodos();
            } else {
                console.error('Failed to delete todo:', response.status);
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    };

    // Add function to handle category creation
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setCategoryLoading(true);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/todo/categories/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newCategory,
                    user: user?.id,  // Include user.id in the payload
                }),
            });

            if (response.ok) {
                await fetchCategories();
                setNewCategory('');
            } else {
                console.error('Failed to add category:', response.status);
            }
        } catch (error) {
            console.error('Error adding category:', error);
        } finally {
            setCategoryLoading(false);
        }
    };

    // Function to handle editing a todo
    const handleEditTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetchWithTokenRefresh(`${BASE_URL}/todo/tasks/${editingTodo?.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    user: user?.id,
                    category: categories.find(cat => cat.name === formData.category)?.id,
                }),
            });

            if (response.ok) {
                await fetchTodos();
                setFormData({
                    title: '',
                    description: '',
                    status: 'IN_PROGRESS',
                    priority: 'MEDIUM',
                    deadline: '',
                    category: '',
                });
                setEditingTodo(null); // Reset editing state
            } else {
                console.error('Failed to edit todo:', response.status);
                const errorData = await response.json();
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error editing todo:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to initiate editing
    const initiateEdit = (todo: Todo) => {
        setFormData({
            title: todo.title,
            description: todo.description,
            status: todo.status,
            priority: todo.priority,
            deadline: todo.deadline,
            category: todo.category,
        });
        setEditingTodo(todo);
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: alpha(theme.palette.primary.main, 0.03),
        }}>
            <AppBar position="static" elevation={0}>
                <Toolbar sx={{
                    px: { xs: 2, sm: 4 },
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                }}>
                    <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
                        ✨ Todo Dashboard
                    </Typography>
                    <Button
                        color="inherit"
                        onClick={logout}
                        startIcon={<LogoutIcon />}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Add New Category
                    </Typography>
                    <Box component="form" onSubmit={handleAddCategory}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                label="Category Name"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                required
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={categoryLoading}
                                sx={{
                                    minWidth: 120,
                                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                                }}
                            >
                                {categoryLoading ? <CircularProgress size={24} /> : 'Add Category'}
                            </Button>
                        </Stack>
                    </Box>
                </Paper>

                <Paper sx={{ p: 4, borderRadius: 2 }}>
                    <Box component="form" onSubmit={editingTodo ? handleEditTodo : handleAddTodo}>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={formData.title}
                                onChange={(e) => handleFormChange('title', e.target.value)}
                                required
                            />

                            <TextField
                                fullWidth
                                label="Description"
                                value={formData.description}
                                onChange={(e) => handleFormChange('description', e.target.value)}
                                multiline
                                rows={3}
                            />

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        label="Status"
                                        onChange={(e) => handleFormChange('status', e.target.value)}
                                    >
                                        <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                                        <MenuItem value="COMPLETED">Completed</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={formData.priority}
                                        label="Priority"
                                        onChange={(e) => handleFormChange('priority', e.target.value)}
                                    >
                                        <MenuItem value="LOW">Low</MenuItem>
                                        <MenuItem value="MEDIUM">Medium</MenuItem>
                                        <MenuItem value="HIGH">High</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        value={formData.category}
                                        label="Category"
                                        onChange={(e) => handleFormChange('category', e.target.value)}
                                    >
                                        {categories.map((category) => (
                                            <MenuItem key={category.name} value={category.name}>
                                                {category.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="Deadline"
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => handleFormChange('deadline', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Stack>

                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<AddIcon />}
                                disabled={isLoading}
                                sx={{
                                    py: 1.5,
                                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                                }}
                            >
                                {isLoading ? <CircularProgress size={24} /> : 'Add Todo'}
                            </Button>
                        </Stack>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <List>
                        {todos.map((todo) => (
                            <Paper
                                key={todo.id}
                                elevation={0}
                                sx={{
                                    mb: 2,
                                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    }
                                }}
                            >
                                <ListItem>
                                    <Checkbox
                                        checked={todo.status === 'COMPLETED'}
                                        onChange={() => handleToggleTodo(todo.id)}
                                    />
                                    <ListItemText
                                        primary={
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    textDecoration: todo.status === 'COMPLETED' ? 'line-through' : 'none',
                                                    color: todo.status === 'COMPLETED' ? 'text.secondary' : 'text.primary',
                                                }}
                                            >
                                                {todo.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <Stack spacing={1} sx={{ mt: 1 }}>
                                                <Typography variant="body2">{todo.description}</Typography>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        }}
                                                    >
                                                        {todo.category}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            bgcolor: alpha(
                                                                todo.priority === 'HIGH'
                                                                    ? theme.palette.error.main
                                                                    : todo.priority === 'MEDIUM'
                                                                        ? theme.palette.warning.main
                                                                        : theme.palette.success.main,
                                                                0.1
                                                            ),
                                                            color:
                                                                todo.priority === 'HIGH'
                                                                    ? theme.palette.error.main
                                                                    : todo.priority === 'MEDIUM'
                                                                        ? theme.palette.warning.main
                                                                        : theme.palette.success.main,
                                                        }}
                                                    >
                                                        {todo.priority}
                                                    </Typography>
                                                    <Typography variant="caption">
                                                        Due: {new Date(todo.deadline).toLocaleDateString()}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => initiateEdit(todo)} // Trigger edit
                                            sx={{ color: theme.palette.primary.main }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleDeleteTodo(todo.id)}
                                            sx={{ color: theme.palette.error.main }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </Paper>
                        ))}
                    </List>

                    {todos.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <Typography variant="h6">No todos yet</Typography>
                            <Typography variant="body2">Add your first todo above!</Typography>
                        </Box>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}
