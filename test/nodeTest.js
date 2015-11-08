describe("JSON", function() {
    describe(".parse()", function() {
        it("should detect malformed JSON strings", function(done){

            //Test Goes Here
            var results = {
                depth: 4
            };
            //expect(results).to.have.a.property("depth", 4);
            expect(results.depth).toEqual(4);

            var express = require('express');

            var app = express();

            app.get('/', function (req, res) {
                res.send('Hello World!');
            });

            var server = app.listen(3000, function () {
                var host = server.address().address;
                var port = server.address().port;

                console.log('Example app listening at http://%s:%s', host, port);
            });

            var blah = new XMLHttpRequest();

            blah.open("get", "http://localhost:3000/");
            blah.onreadystatechange = function() {
                if(blah.readyState == 4) {
                    console.log("Out: " + blah.responseText);
                    done();
                }
            };
            blah.send();
        });
    });
});