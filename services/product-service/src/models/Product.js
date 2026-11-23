const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, trim: true, lowercase: true, index: true, default: 'general' },
    priceCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
  },
  { timestamps: true },
);

productSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Product', productSchema);
