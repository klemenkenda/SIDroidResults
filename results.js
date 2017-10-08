// FILE: results.js
// AUTHOR: Klemen Kenda (2017)
// DESCRIPTION: Part of OK Azimut SI-Droid results web application.

// cookie handling functions
function createCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}


/**
 * Results
 * Class, dealing with IOF XML v3 result file.
 */
function Results() {
    // constructor -------------------------------------------------
    this.eventName = 'Race name';
    this.timeStamp = '';
    this.classes = [];

    // extract recent data from cookies
    if ('eventName'in localStorage) this.eventName = localStorage['eventName'];
    if ('timeStamp' in localStorage) this.timeStamp = localStorage['timeStamp'];
    if ('classes' in localStorage) this.classes = JSON.parse(localStorage['classes']);
    // end of constructor ------------------------------------------

    /**
     * loadXML
     * @param {xml} xml     XML document with IOF XML v3 data.
     */
    this.loadXML = function(xml) {
        // self for reference in async routines
        // results is passed as a reference to the object
        
        console.log("Load XML");
        $xml = $(xml);
        results.timeStamp = timeStamp = $xml.find("ResultList").attr("createTime");
        console.log("XML timestamp", this.timeStamp);
        
        // extract event name
        this.eventName = $xml.find("ResultList").find("Event").find("Name").text();
        console.log("Event name", this.eventName);

        // extract categories and results
        results.classes = [];
        $xml.find("ResultList").find("ClassResult").each(function() {
            var className = $(this).find("Class").find("Name").text();
            var resultTable = results.extractTable($(this));
            results.classes.push({ class: className, results: resultTable });
        }, results);
        console.log("Classes num", results.classes.length);

        // save extracted data into localStorage
        localStorage["timeStamp"] = results.timeStamp;
        localStorage["eventName"] = results.eventName;
        localStorage.setItem("classes", JSON.stringify(results.classes));
        
        // update categories, results and metadata
        results.updateClasses();
        results.updateResults();
        results.updateMetadata();
    };


    /**
     * extractTable
     * @param {xml} $classResult    ClassResult part from IOF XML v3.
     * @param {object} self         Pointer to results object.
     */
    this.extractTable = function($classResult) {
        // create empty result table
        var resultTable = [];
        // transverse through the persons
        $classResult.find("PersonResult").each(function() {
            // extract name
            var given = $(this).find("Person").find("Given").text();
            var family = $(this).find("Person").find("Family").text();
            var name = given + ' ' + family;
            // extract club
            var club = $(this).find("Organisation").find("Name").text();
            // extract time, time behind, status and position
            var time = $(this).find("Result > Time").text();
            var timeBehind = $(this).find("Result").find("TimeBehind").text();
            var status = $(this).find("Result").find("Status").text();
            var position = $(this).find("Result").find("Position").text();
            // convert statuses
            if (status == "DidNotFinish") status = "DNF";
            if (status == "MissingPunch") status = "MP";
            if (status == "DidNotStart") status= "DNS";
            // create object and add it to the table
            var resultPerson = {
                name: name,
                club: club,
                time: time,
                timeBehind: timeBehind,
                status: status,
                position: position
            };
            resultTable.push(resultPerson);
        });

        return resultTable;        
    }

    /**
     * updateClasses
     * Updates categories on the main page.
     */
    this.updateClasses = function() {
        console.log("updateClasses", this.classes);
        $("#classes").empty();
        for (var i in this.classes) {
            $("#classes").append('<button type="button" class="btn btn-primary" style="width: 100%; margin-bottom: 4px;">' + this.classes[i].class + '</button>');
            $("#classes").append('<div id="' + this.classes[i].class + '"></div>')
        };
    };


    /**
     * formatTime
     * @param {int} time Time in seconds.
     * Formats time from seconds to mmm:ss.
     */
    this.formatTime = function(time) {
        var secs = time % 60 + "";
        if (secs.length == 1) secs = "0" + secs;
        var min = Math.floor(time / 60);
        return min + ":" + secs;
    }

    /**
     * updateResults
     * Updates results tables on the main page.
     */
    this.updateResults = function() {
        for (var i in this.classes) {
            var className = this.classes[i].class;
            var results = this.classes[i].results;
            var classHash = "#" + className;
            // create results
            $(classHash).empty();
            $(classHash).append('<table class="table table-hover table-striped"><tbody></tbody></table>');
            
            for (var j in results) {
                console.log(results[j]);
                var name = results[j].name;
                var status = results[j].status;
                var position = results[j].position;
                var club = results[j].club;
                var time = results[j].time;
                var timeBehind = results[j].timeBehind;

                // render fields
                name = name + '<br><span class="small">' + club + "</span>";

                time = this.formatTime(time);
                timeBehind = this.formatTime(timeBehind);
                if (timeBehind != "0:00") timeBehind = "+" + timeBehind;
                if (status != "OK") {
                    position = "";
                    time = status;
                    timeBehind = "--:--";
                }
                
                time = time + '<br><span class="small">' + timeBehind + "</span>";

                // add to table
                $(classHash + " table > tbody")
                    .append('<tr><td>' + position + '</td><td>' + name + '</td><td align="right">' + time + '</td></tr>');
            }

        }
    };

    /**
     * updateMetadata
     * Updates metadata tables on the main page.
     */
    this.updateMetadata = function() {
        $("#title h2").text(this.eventName);
        $("#date").text(this.timeStamp);
    };

    // postConstructor
    // update values in GUI
    var self = this;
    $(document).ready(function() {
        self.updateClasses();
        self.updateResults();
        self.updateMetadata();
    });
}

var results = new Results();


// main script -----------------------------------------------------
// load XML file
$(document).ready(function () {
    $.ajax({
        type: "GET",
        url: "results-IOFv3.xml",
        cache: false,
        dataType: "xml",
        success: results.loadXML,
        context: results
    });
});
