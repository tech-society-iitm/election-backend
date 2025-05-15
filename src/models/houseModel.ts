import mongoose, { Document, Schema, Model } from 'mongoose';
import { IHouse } from '../../types/interfaces';


// Create the schema
const houseSchema = new Schema<IHouse>({
  name: {
    type: String,
    required: [true, 'House must have a name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#000000'
  },
  logo: String,
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  secretaries: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A house must have a creator']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

// Create and export the model
const House: Model<IHouse> = mongoose.model<IHouse>('House', houseSchema);

export default House;
