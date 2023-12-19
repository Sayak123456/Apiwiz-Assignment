const Conversations = require('../models/conversation');
const Messages = require('../models/message');
const router = require('express').Router();
const auth = require('../middleware/auth');

class Pagination {
    constructor(query, queryString){
        this.query = query;
        this.queryString = queryString;
    }

    paginating(){
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 10;
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

// Create a new message
router.post('/createMessage', auth, async (req, res) => {
    try{
        const { sender, recipient, text, media } = req.body;

        if(!recipient || (!text.trim() && media.length === 0)) return;

        const newConversation = await Conversations.findOneAndUpdate({
            $or: [
                {recipients: [sender, recipient]},
                {recipients: [recipient, sender]}
            ]
        }, {
            recipients: [sender, recipient],
            text, media
        }, { new: true, upsert: true });

        const newMessage = new Messages({
            conversation: newConversation._id,
            sender,
            recipient,
            text,
            media
        });

        await newMessage.save();
        res.json({msg: 'Create Success!'});
    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Get Messages
router.get('/getMessages', auth, async (req, res) => {
    try{
        const features = new Pagination(Messages.find({
            $or: [
                {sender: req.user._id, recipient: req.params.id},
                {sender: req.params.id, recipient: req.user._id}
            ]
        }), req.query).paginating();

        const messages = await features.query.sort('-createdAt');

        res.json({
            messages,
            result: messages.length
        });
    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Get conversations
router.get('/getConversation', auth, async (req, res) => {
    try{
        const features = new Pagination(Conversations.find({
            recipients: req.user._id
        }), req.query).paginating();

        const conversations = await features.query.sort('-updatedAt')
        .populate('recipients', 'avatar username fullname');

        res.json({
            conversations,
            result: conversations.length
        });
    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

module.exports = router;