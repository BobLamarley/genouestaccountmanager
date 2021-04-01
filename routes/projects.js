/* TODO : create a core/project.service.js and move all method in it */

const express = require('express');
var router = express.Router();
const winston = require('winston');
const logger = winston.loggers.get('gomngr');

const cfgsrv = require('../core/config.service.js');
let my_conf = cfgsrv.get_conf();
var CONFIG = my_conf;
var GENERAL_CONFIG = CONFIG.general;

// const cookieParser = require('cookie-parser');
// const goldap = require('../routes/goldap.js');

const dbsrv = require('../core/db.service.js');
const maisrv = require('../core/mail.service.js');
const sansrv = require('../core/sanitize.service.js');
const rolsrv = require('../core/role.service.js');
const prjsrv = require('../core/project.service.js');


router.get('/project', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send({message: 'Not authorized'});
        return;
    }

    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }

    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    if(!isadmin){
        if (! user.projects) {
            res.send([]);
            return;
        } else {
            let projects = await dbsrv.mongo_projects().find({id: {$in : user.projects}}).toArray();
            res.send(projects);
            return;
        }
    } else {
        if (req.query.all === 'true'){
            let projects = await dbsrv.mongo_projects().find({}).toArray();
            res.send(projects);
            return;
        } else {
            if (! user.projects) {
                res.send([]);
                return;
            } else {
                let projects = await dbsrv.mongo_projects().find({id: {$in : user.projects}}).toArray();
                res.send(projects);
                return;
            }
        }
    }
});

router.get('/project/:id', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    if(! sansrv.sanitizeAll([req.params.id])) {
        res.status(403).send({message: 'Invalid parameters'});
        return;
    }
    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }

    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    if(!isadmin){
        res.status(401).send({message: 'Admin only'});
        return;
    }
    let project = await dbsrv.mongo_projects().findOne({'id': req.params.id});

    if (! project){
        logger.error('failed to get project', req.params.id);
        res.status(404).send({message: 'Project ' + req.params.id + ' not found'});
        return;
    }
    res.send(project);
});

router.post('/project', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    if(! sansrv.sanitizeAll([req.body.id])) {
        res.status(403).send({message: 'Invalid parameters'});
        return;
    }
    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }
    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    if(!isadmin){
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    let owner = await dbsrv.mongo_users().findOne({'uid': req.body.owner});
    if(!owner){
        res.status(404).send({message: 'Owner not found'});
        return;
    }
    let project = await dbsrv.mongo_projects().findOne({'id': req.body.id});
    if(project){
        res.status(403).send({message: 'Not authorized or project already exists'});
        return;
    }

    try {
        await prjsrv.create_project({
            'id': req.body.id,
            'owner': req.body.owner,
            'group': req.body.group,
            'size': req.body.size,
            'expire': req.body.expire,
            'description': req.body.description,
            'path': req.body.path,
            'orga': req.body.orga,
            'access': req.body.access
        }, req.body.uuid, user.uid);
    } catch(e) {
        logger.error(e);
        if (e.code && e.message) {
            res.status(e.code).send({message: e.message});
            res.end();
            return;
        } else {
            res.status(500).send({message: 'Server Error, contact admin'});
            res.end();
            return;
        }
    }

    res.send({message: 'Project created'});
    return;
});

router.delete('/project/:id', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    if(! sansrv.sanitizeAll([req.params.id])) {
        res.status(403).send({message: 'Invalid parameters'});
        return;
    }
    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }

    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    if(!isadmin){
        res.status(401).send({message: 'Not authorized'});
        return;
    }

    try {
        await prjsrv.remove_project(req.params.id, user.uid);
    } catch(e) {
        logger.error(e);
        if (e.code && e.message) {
            res.status(e.code).send({message: e.message});
            res.end();
            return;
        } else {
            res.status(500).send({message: 'Server Error, contact admin'});
            res.end();
            return;
        }
    }
    res.send({message: 'Project deleted'});

});

router.post('/project/:id', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    if(! sansrv.sanitizeAll([req.params.id])) {
        res.status(403).send({message: 'Invalid parameters'});
        return;
    }
    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }

    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    if(!isadmin){
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    let project = await dbsrv.mongo_projects().findOne({'id': req.params.id});
    if(!project){
        res.status(401).send({message: 'Not authorized or project not found'});
        return;
    }
    try {
        await prjsrv.update_project(req.params.id, {
            'owner': req.body.owner,
            'group': req.body.group,
            'size': req.body.size,
            'expire': req.body.expire,
            'description': req.body.description,
            'access': req.body.access,
            'orga': req.body.orga,
            'path': req.body.path
        }, user.uid);
    } catch(e) {
        logger.error(e);
        if (e.code && e.message) {
            res.status(e.code).send({message: e.message});
            res.end();
            return;
        } else {
            res.status(500).send({message: 'Server Error, contact admin'});
            res.end();
            return;
        }
    }
    res.send({message: 'Project updated'});
});

router.post('/project/:id/request', async function(req, res){
    if(! req.locals.logInfo.is_logged){
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    if(! sansrv.sanitizeAll([req.params.id])) {
        res.status(403).send({message: 'Invalid parameters'});
        return;
    }
    let user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    let project = await dbsrv.mongo_projects().findOne({'id': req.params.id});
    if(!project){
        res.status(404).send({message: 'Project ' + req.params.id + ' not found'});
        return;
    }
    //Add to request list
    if(! user.uid === project.owner ){
        res.status(401).send({message: 'User ' + user.uid + ' is not project manager for project ' + project.id});
        return;
    }
    let newuser = await dbsrv.mongo_users().findOne({'uid': req.body.user});
    if(!newuser){
        res.status(404).send({message: 'User ' + req.body.user + ' not found'});
        return;
    }
    if(newuser.projects && newuser.projects.indexOf(project.id) >= 0 && req.body.request === 'add'){
        res.status(403).send({message: 'User ' + req.body.user + ' is already in project : cannot add'});
        return;
    }
    //Backward compatibility
    if (! project.add_requests){
        project.add_requests = [];
    }
    if (! project.remove_requests){
        project.remove_requests = [];
    }
    if ( project.add_requests.indexOf(req.body.user) >= 0 || project.remove_requests.indexOf(req.body.user) >= 0){
        res.status(403).send({message: 'User ' + req.body.user + 'is already in a request : aborting'});
        return;
    }
    if (req.body.request === 'add'){
        project.add_requests.push(req.body.user);
    } else if (req.body.request === 'remove') {
        project.remove_requests.push(req.body.user);
    }
    let new_project = { '$set': {
        'add_requests': project.add_requests,
        'remove_requests': project.remove_requests
    }};
    await dbsrv.mongo_projects().updateOne({'id': req.params.id}, new_project);
    await dbsrv.mongo_events().insertOne({'owner': user.uid, 'date': new Date().getTime(), 'action': 'received request ' + req.body.request + ' for user ' + req.body.user + ' in project ' + project.id , 'logs': []});

    try {
        await maisrv.send_notif_mail({
            'name': 'ask_project_user',
            'destinations': [GENERAL_CONFIG.accounts],
            'subject': 'Project ' + req.body.request + ' user request: ' + req.body.user
        }, {
            '#UID#':  user.uid,
            '#NAME#': project.id,
            '#USER#': req.body.user,
            '#REQUEST#': req.body.request

        });
    } catch(error) {
        logger.error(error);
    }


    res.send({message: 'Request sent'});
});

//Admin only, remove request
router.put('/project/:id/request', async function(req, res){
    if(! req.locals.logInfo.is_logged){
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    if(! sansrv.sanitizeAll([req.params.id])) {
        res.status(403).send({message: 'Invalid parameters'});
        return;
    }
    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }
    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    if(!isadmin){
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    let project = await dbsrv.mongo_projects().findOne({'id': req.params.id});
    if(!project){
        res.status(401).send({message: 'Not authorized or project not found'});
        return;
    }
    if (! req.body.user || ! req.body.request){
        res.status(403).send({message: 'User and request type are needed'});
        return;
    }
    let temp_requests = [];
    if(req.body.request === 'add' ){
        for(let i=0;i<project.add_requests.length;i++){
            if( project.add_requests[i] !== req.body.user ){
                temp_requests.push(project.add_requests[i]);
            }
        }
        project.add_requests = temp_requests;
    } else if (req.body.request === 'remove' ){
        for(let i=0;i<project.remove_requests.length;i++){
            if( project.remove_requests[i] !== req.body.user){
                temp_requests.push(project.remove_requests[i]);
            }
        }
        project.remove_requests = temp_requests;
    }
    let new_project = { '$set': {
        'add_requests': project.add_requests,
        'remove_requests': project.remove_requests
    }};
    await dbsrv.mongo_projects().updateOne({'id': req.params.id}, new_project);
    res.send({message: 'Request removed'});
});


router.post('/ask/project', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    let user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }

    try {
        await prjsrv.create_project_request({
            'id': req.body.id,
            'owner': user.uid,
            'group': user.group,
            'size': req.body.size,
            'description': req.body.description,
            'orga': req.body.orga
        }, user.uid);
    } catch(e) {
        logger.error(e);
        if (e.code && e.message) {
            res.status(e.code).send({message: e.message});
            res.end();
            return;
        } else {
            res.status(500).send({message: 'Server Error, contact admin'});
            res.end();
            return;
        }
    }
    res.send({ message: 'Pending Project created'});
    return;
});

router.get('/pending/project', async function (req, res) {

    if (!req.locals.logInfo.is_logged) {
        res.status(401).send('Not authorized');
        return;
    }
    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({ _id: req.locals.logInfo.id });
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }

    if (!user) {
        res.status(404).send('User not found');
        return;
    }
    if (!isadmin) {
        if (!user.pending) {
            res.send([]);
            return;
        } else {
            let pendings = await dbsrv.mongo_pending_projects().find({ id: { $in: user.pending } }).toArray();
            res.send(pendings);
            return;
        }
    } else {
        if (req.query.all === 'true') {
            let pendings = await dbsrv.mongo_pending_projects().find({}).toArray();
            res.send(pendings);
            return;
        } else {
            if (!user.pending) {
                res.send([]);
                return;
            } else {
                let pendings = await dbsrv.mongo_pending_projects().find({ id: { $in: user.pending } }).toArray();
                res.send(pendings);
                return;
            }
        }
    }
});

router.delete('/pending/project/:uuid', async function (req, res) {
    if (!req.locals.logInfo.is_logged) {
        res.status(401).send('Not authorized');
        return;
    }
    let user = null;
    let isadmin = false;
    try {
        user = await dbsrv.mongo_users().findOne({ _id: req.locals.logInfo.id });
        isadmin = await rolsrv.is_admin(user);
    } catch(e) {
        logger.error(e);
        res.status(404).send({message: 'User session not found'});
        res.end();
        return;
    }

    if (!user) {
        res.status(404).send('User not found');
        return;
    }
    if (!isadmin) {
        res.status(401).send('Not authorized');
        return;
    }

    try {
        await prjsrv.remove_project_request(req.params.uuid, user.uid);
    } catch(e) {
        logger.error(e);
        if (e.code && e.message) {
            res.status(e.code).send({message: e.message});
            res.end();
            return;
        } else {
            res.status(500).send({message: 'Server Error, contact admin'});
            res.end();
            return;
        }
    }
    res.send({ message: 'Pending Project deleted'});

});

router.get('/project/:id/users', async function(req, res){
    if(! req.locals.logInfo.is_logged) {
        res.status(401).send({message: 'Not authorized'});
        return;
    }
    if(! sansrv.sanitizeAll([req.params.id])) {
        res.status(403).send({message: 'Invalid parameters'});
        return;
    }
    let user = await dbsrv.mongo_users().findOne({_id: req.locals.logInfo.id});
    if(!user){
        res.status(404).send({message: 'User not found'});
        return;
    }
    let users_in_project = await dbsrv.mongo_users().find({'projects': req.params.id}).toArray();
    res.send(users_in_project);
    res.end();
});


router.post;
module.exports = router;
