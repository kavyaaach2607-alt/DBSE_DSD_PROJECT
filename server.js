require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/products.routes');
const warehouseRoutes = require('./routes/warehouses.routes');
const supplierRoutes = require('./routes/suppliers.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const transactionRoutes = require('./routes/transactions.routes');
const reportRoutes = require('./routes/reports.routes');
const forecastRoutes = require('./routes/forecast.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ message: 'Inventory & Warehouse Management API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/forecast', forecastRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
