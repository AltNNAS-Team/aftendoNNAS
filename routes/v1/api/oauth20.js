const express = require('express');
const logger = require('logger');
const auth = require('auth');
const knex = require('db');
const nn_error = require('nn_error');
const moment = require ('moment')

const route = express.Router();

const xmlbuilder = require("xmlbuilder");
const crypto = require("node:crypto");

route.use((req, res, next) => {
    auth.checkAuth(req, res, next);
});

/*
    Generates an access token for NEX? Not sure what this really is for.
    Handles logging in though.
    Content-Type: XML

    For invalid password, return nn_error.createError("0106", "Invalid account ID or password"); with a 400 status
    Sends post data
    grant_type (seen as "password" atm)
    user_id (username)
    password (sha1 hash?)
*/
route.post("/access_token/generate", (req, res) => {
    const { grant_type, user_id, password } = req.body;
    if(grant_type != "password" && grant_type != "refresh_token"){
        res.status(400).send(nn_error.createError("0004", "Invalid grant type"));
        return;
    }
    knex.select('*')
        .from('people')
        .where({
            user_id: user_id
        })
        .then(rows => {
            if (rows.length == 0) {
                res.status(400).send(nn_error.createError("0112", "Account is deleted"));
                return;
            } else {
                if (rows[0].password != req) {
                    res.status(400).send(nn_error.createError("0106", "Invalid account ID or password"));
                    return;
                } else {
                    const token = crypto.randomBytes(15).toString('hex');
                    knex("access_tokens").insert({
                        pid: rows[0].id,
                        token: token,
                        expires: moment().add(1, 'hour')
                    })
                        .then(function () {
                            res.send(xmlbuilder.create({OAuth20: {
                                access_token: {
                                    token: token,
                                    refresh_token: "Test",
                                    expires_in: 3600
                                }
                            }}).end({pretty: true, allowEmpty: true}))
                        })
                        .catch(err => {
                            console.log(err);
                            res.status(500).send(utils.generateServerError());
                            return;
                        })
                }
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).send(utils.generateServerError());
            return;
        })
})

module.exports = route