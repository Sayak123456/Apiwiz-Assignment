const router = require('express').Router();
const auth = require('../middleware/auth');
const Comments = require('../models/comment');
const Posts = require('../models/post');

// Create comment
router.post('/comment', auth, async (req, res) => {
    try {
        const { postId, text, tag, reply, postUserId } = req.body;

        const post = await Posts.findById(postId)
        if(!post) return res.status(400).json({msg: "This post does not exist."});

        if(reply){
            const comment = await Comments.findById(reply);
            if(!comment) return res.status(400).json({msg: "This comment does not exist."});
        }

        const newComment = new Comments({
            user: req.user._id, text, tag, reply, postUserId, postId
        })

        await Posts.findOneAndUpdate({_id: postId}, {
            $push: {comments: newComment._id}
        }, {new: true});

        await newComment.save();

        res.json({newComment});

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Update comment
router.patch('/comment/:id', auth, async (req, res) => {
    try {
        const { text } = req.body;
        
        await Comments.findOneAndUpdate({
            _id: req.params.id, user: req.user._id
        }, {text});

        res.json({msg: 'Update Success!'});

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Like Comment
router.patch('/comment/:id/like', auth, async (req, res) => {
    try {
        const comment = await Comments.find({_id: req.params.id, likes: req.user._id});
        if(comment.length > 0) return res.status(400).json({msg: "You liked this post."});

        await Comments.findOneAndUpdate({_id: req.params.id}, {
            $push: {likes: req.user._id}
        }, {new: true});

        res.json({msg: 'Comment Liked!'});

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Dislike comment
router.patch('/comment/:id/dislike', auth, async (req, res) => {
    try {
        await Comments.findOneAndUpdate({_id: req.params.id}, {
            $pull: {likes: req.user._id}
        }, {new: true});

        res.json({msg: 'Comment Disliked!'});

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Delete Comment
router.delete('/comment/:id', auth, async (req, res) => {
    try {
        const comment = await Comments.findOneAndDelete({
            _id: req.params.id,
            $or: [
                {user: req.user._id},
                {postUserId: req.user._id}
            ]
        });

        await Posts.findOneAndUpdate({_id: comment.postId}, {
            $pull: {comments: req.params.id}
        });

        res.json({msg: 'Comment Deleted!'});

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

module.exports = router;