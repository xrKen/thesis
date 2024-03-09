var mongoose = require("mongoose");
const allCategory = [
    'Motorcycle Vehicles', 'Heavy Equipment Vehicles', 'Military Vehicles', '4-Wheel Vehicles'
]
var schema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', required: true
    },
    assignPersonel: {
        type: String,
        required: true
    },
    dateIssued: {
        type: String,
        required: true
    },
    condition: {
        type: String,
        required: true
    },
    OrCr: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    plateNumber: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    dateDeployed: {
        type: String,
    },
    category: {
        type: String,
        enum: allCategory,
        required: true
    },
    qty: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    
}, {
    versionKey: false,
    timestamps: true
}
);


module.exports = mongoose.model("Vehicle", schema, "Vehicle");