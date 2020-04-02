const express = require('express');
const router = express.Router();
const fetch = require("node-fetch");
require('dotenv').config();

var rest_api_ip   = process.env.LIBERTY_APP_SERVICE_HOST || process.env.LIBERTY_TEKTON_SERVICE_HOST || 'liberty-app';
var rest_api_port = process.env.LIBERTY_APP_SERVICE_PORT || process.env.LIBERTY_TEKTON_SERVICE_PORT || '9080';

const OWM_API_KEY = process.env.OWM_API_KEY || 'none' ;
const AUTHORS_API_KEY = process.env.MY_API_KEY || 'none' ;
const UNITS = process.env.UNITS || 'metric';

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { weather: null, err: null, links: null, error_authors: null });
});

router.post('/get_links', async function (req,res) {
  let author = req.body.author;
  let url = `http://${rest_api_ip}:${rest_api_port}/authors/v1/getauthor?name=${author}&appid=${AUTHORS_API_KEY}`;

  try {
    let data = await fetch(url);
    let links = await data.json();
    console.log(links);
    if(links.cod == '404' && links.main == undefined) {
      res.render('index', {links: null, error_authors: 'Error: Unknown author.'});
    }
    else if (links.cod == '401' && links.main == undefined) {
      res.render('index', {links: null, error_authors: 'Error: Invalid credentials for API call.'});
    }
    else {
      res.render('index', {links: links, error_authors: null});
    }
  }
  catch (err) {
    console.log(err);
    res.render('index', {links: null, error_authors: 'Error: Unable to invoke OpenLiberty API'});
  }

});

router.post('/get_weather', async function (req,res) {
  let city = req.body.city;
  let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=${UNITS}&appid=${OWM_API_KEY}`;

  try {
    let data = await fetch(url);
    let weather = await data.json();
    console.log(weather);
    if(weather.cod == '404' && weather.main == undefined) {
      res.render('index', {weather: null, error: 'Error: Unknown city'});
    }
    else if (weather.cod == '401' && weather.main == undefined) {
      res.render('index', {weather: null, error: 'Error: Invalid API Key. Please see http://openweathermap.org/faq#error401 for more info.'});
    }
    else {
      let unit_hex = (UNITS == 'imperial') ? '&#8457' : '&#8451';
      res.render('index', {weather: weather, error: null, units: unit_hex});
    }
  }
  catch (err) {
    console.log(err);
    res.render('index', {weather: null, error: 'Error: Unable to invoke OpenWeatherMap API'});
  }

});

module.exports = router;
