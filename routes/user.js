const router = require('express').Router();
const auth = require("../middleware/auth");
const Users = require('../models/user')

// Search User
router.get('/search', auth, async(req, res) => {
    try {
        const users = await Users.find({username: {$regex: req.query.username}})
        .limit(10).select("fullname username avatar")
        
        res.json({users})
    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
});

// Search User by Id
router.get('/user/:id', auth, async(req, res) => {
    try {
        const user = await Users.findById(req.params.id).select('-password')
        .populate("followers following", "-password")
        if(!user) return res.status(400).json({msg: "User does not exist."})
        
        res.json({user})
    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
});

// Update user details
router.patch('/user', auth, async(req, res) => {
    try {
        const { avatar, fullname, mobile, gender } = req.body
        if(!fullname) return res.status(400).json({msg: "Please add your full name."})

        await Users.findOneAndUpdate({_id: req.user._id}, {
            avatar, fullname, mobile, gender
        })

        res.json({msg: "Update Success!"})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
});

// Follow user
router.patch('/user/:id/follow', auth, async(req, res) => {
    try {
        const user = await Users.find({_id: req.params.id, followers: req.user._id})
        if(user.length > 0) return res.status(500).json({msg: "You followed this user."})

        const newUser = await Users.findOneAndUpdate({_id: req.params.id}, { 
            $push: {followers: req.user._id}
        }, {new: true}).populate("followers following", "-password")

        await Users.findOneAndUpdate({_id: req.user._id}, {
            $push: {following: req.params.id}
        }, {new: true})

        res.json({newUser})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
});

// Unfollow user
router.patch('/user/:id/unfollow', auth, async(req, res) => {
    try {
        const newUser = await Users.findOneAndUpdate({_id: req.params.id}, { 
            $pull: {followers: req.user._id}
        }, {new: true}).populate("followers following", "-password")

        await Users.findOneAndUpdate({_id: req.user._id}, {
            $pull: {following: req.params.id}
        }, {new: true})

        res.json({newUser})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
});

module.exports = router;