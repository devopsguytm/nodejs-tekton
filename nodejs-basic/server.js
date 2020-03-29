var express       = require('express');
var app           = express();
var ip            = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
var rest_api_ip   = process.env.LIBERTY_APP_SERVICE_HOST || process.env.LIBERTY_TEKTON_SERVICE_HOST || 'liberty-app';
var rest_api_port = process.env.LIBERTY_APP_SERVICE_PORT || process.env.LIBERTY_TEKTON_SERVICE_PORT || '9080';

var user            = process.env.USERNAME;
var pass            = process.env.PASSWORD;

const request     = require('request');

app.get('/', function(req, res) {
    
     request('http://'+rest_api_ip+':'+rest_api_port+'/authors/v1/getauthor?name=Niklas%20Heidloff', { json: true }, (err, res2, body) => {

       var response = '';
       response += '<b>Hello from NodeJS !</b><br><br>';
       response += new Date() + '<br><br>';

       if (err) { 
               
	   response += 'Response from Liberty : '+rest_api_ip+':'+rest_api_port+' -> ERROR';
     response += '<br><br>';
     response += 'Secret credentials : USERNAME='+user+'  and  PASSWORD='+pass;
	   res.send(response);
	       
	   return console.log(err); 
       }

       console.log('REST API       = '+rest_api_ip+':'+rest_api_port);
       console.log('body.name      = '+body.name);
       console.log('body.blog      = '+body.blog);

       response += 'http://'+rest_api_ip+':'+rest_api_port+'/authors/v1/getauthor?name=Niklas%20Heidloff'+ '<br><br>';
       response += 'Response from Liberty : '+rest_api_ip+':'+rest_api_port+' -> '+ body.name + ' : ' + body.blog;
       response += '<br><br>';
       response += 'Secret credentials : USERNAME='+user+'  and  PASSWORD='+pass;

       res.send(response);

    });	
	
});

app.listen(8080, ip);

module.exports = app;
