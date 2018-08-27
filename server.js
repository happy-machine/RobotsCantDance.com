var http = require('http');
var express = require('express');
var app = express();
const port = process.env.PORT || 5000;


app.use('/api/getAstraModel',
    express.static('./models/astra_model/model.json')
);
app.use('/api',
    express.static('./models/astra_model')
);
app.use('/api/getAstraMetadata',
    express.static('./models/Astrazeneca_dict.json')
);
app.use('/api500/getAstraModel',
    express.static('./models/astra_500_model/model.json')
);
app.use('/api500/getAstraMetadata',
express.static('./models/Astrazeneca_dict_500.json')
);
app.use('/api500',
    express.static('./models/astra_500_model')
);
  
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Started TF Model server on localhost://${port}`);
});