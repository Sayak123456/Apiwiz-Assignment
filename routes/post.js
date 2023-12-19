const Posts = require('../models/post');
const Comments = require('../models/comment');
const Users = require('../models/user');
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

// Get all Posts
router.get('/posts', auth, async (req, res) => {
    try {
        const paginatedPosts =  new Pagination(Posts.find({
            user: [...req.user.following, ...req.user.followers, req.user._id],
            isPrivate: false
        }), req.query).paginating();

        const posts = await paginatedPosts.query.sort('-createdAt')
        .populate("user likes", "avatar username fullname followers")
        .populate({
            path: "comments",
            populate: {
                path: "user likes",
                select: "-password"
            }
        });

        res.json({
            msg: 'Success!',
            result: posts.length,
            posts
        })

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Create Post
router.post('/posts', auth, async (req, res) => {
    try {
        const { text, images, isPrivate } = req.body;
        const trimmedText = text.trim();
        console.log(trimmedText);

        if(images.length === 0 && trimmedText.length === 0)
        return res.status(400).json({msg: "Please add some text or photo"});

        const newPost = new Posts({
            text: trimmedText, images, user: req.user._id, isPrivate
        })
        await newPost.save();

        res.json({
            msg: 'Post Created!',
            newPost: {
                ...newPost._doc,
                user: req.user
            }
        })
    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Get Post
router.get('/post/:id', auth, async (req, res) => {
    try {
        const post = await Posts.findById(req.params.id)
        .populate("user likes", "avatar username fullname followers")
        .populate({
            path: "comments",
            populate: {
                path: "user likes",
                select: "-password"
            }
        });

        if(!post) return res.status(400).json({msg: 'This post does not exist.'});

        res.json({
            post
        });

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Update Post
router.patch('/post/:id', auth, async (req, res) => {
    try {
        const { text, images, isPrivate } = req.body;

        const post = await Posts.findOneAndUpdate({_id: req.params.id}, {
            text, images, isPrivate
        }).populate("user likes", "avatar username fullname")
        .populate({
            path: "comments",
            populate: {
                path: "user likes",
                select: "-password"
            }
        });

        res.json({
            msg: "Post Updated!",
            newPost: {
                ...post._doc,
                text, images
            }
        });
    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Delete Post
router.delete('/post/:id', auth, async (req, res) => {
    try {
        const post = await Posts.findOneAndDelete({_id: req.params.id, user: req.user._id});
        await Comments.deleteMany({_id: {$in: post.comments }});

        res.json({
            msg: 'Post Deleted!',
            newPost: {
                ...post,
                user: req.user
            }
        });

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Like Post
router.patch('/posts/:id/like', auth, async (req, res) => {
    try {
        const post = await Posts.find({_id: req.params.id, likes: req.user._id})
        if(post.length > 0) return res.status(400).json({msg: "You already liked this post."})

        const like = await Posts.findOneAndUpdate({_id: req.params.id}, {
            $push: {likes: req.user._id}
        }, {new: true})

        if(!like) return res.status(400).json({msg: 'This post does not exist.'})

        res.json({msg: 'Post Liked!'})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
});

// Unlike Post
router.patch('/posts/:id/dislike', auth, async (req, res) => {
    try {
        const likedPost = await Posts.findOneAndUpdate({_id: req.params.id}, {
            $pull: {likes: req.user._id}
        }, {new: true});

        if(!likedPost) return res.status(400).json({msg: 'This post does not exist or you have not liked the post.'});

        res.json({msg: 'Post Disliked!'})

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

// Get User Posts
router.get('/user_posts/:id', auth, async (req, res) => {
    try {
        let query = {
            user: req.user._id, // Default query for the same user
        };

        if (req.user._id.toString() !== req.params.id) {
            // For other users, fetch non-private posts
            query = {
                user: req.params.id,
                isPrivate: false
            };
        }
        const paginatedPosts = new Pagination(Posts.find(query), req.query).paginating();
        const posts = await paginatedPosts.query.sort("-createdAt");

        res.json({
            posts,
            result: posts.length
        });

    } catch (err) {
        return res.status(500).json({msg: err.message});
    }
});

module.exports = router;