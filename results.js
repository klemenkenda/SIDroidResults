// FILE: results.js
// AUTHOR: Klemen Kenda (2017)
// DESCRIPTION: Part of OK Azimut SI-Droid results web application.

/**
 * Results
 * Class, dealing with IOF XML v3 result file.
 */
function Results() {
    // constructor -------------------------------------------------
    this.eventName = 'Race name';
    this.timeStamp = '';
    this.classes = [];
    this.$xml = null;

    // extract recent data from localStorage
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
        // results is passed as a context to the function
        
        console.log("Load XML");
        $xml = $(xml);
        results.$xml = $xml;
        results.timeStamp = timeStamp = $xml.find("ResultList").attr("createTime");
        console.log("XML timestamp", this.timeStamp);
        
        // extract event name
        this.eventName = $xml.find("ResultList").find("Event").find("Name").text();
        console.log("Event name", this.eventName);

        // extract categories and results
        results.classes = [];
        $xml.find("ResultList").find("ClassResult").each(function() {
            var className = $(this).find("Class").find("Name").text().replace(" ", "-");
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
     * Extracts table of results from the IOF XML v3 (ClassResult).
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
        // empty the classes div
        $("#classes").empty();
        // populate it with titles and result divs
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
        var time = min + ":" + secs;
        // return value replaces NaN (of non existent times) with --
        return time.replace(/NaN/g, "--");
    }

    /**
     * updateResults
     * Updates results tables on the main page.
     */
    this.updateResults = function() {
        // transverse through all classes
        for (var i in this.classes) {
            // find class data
            var className = this.classes[i].class;
            var results = this.classes[i].results;
            var classHash = "#" + className;
            // create results
            // empty the class results DOM object and create a new table in it
            $(classHash).empty();
            $(classHash).append('<table class="table table-hover table-striped"><tbody></tbody></table>');
            
            // transverse through all the persons in the results
            for (var j in results) {
                console.log(results[j]);
                // extract data
                var name = results[j].name;
                var status = results[j].status;
                var position = results[j].position;
                var club = results[j].club;
                var time = results[j].time;
                var timeBehind = results[j].timeBehind;

                // create clickable row href
                href = className + "," + name + "," + time;

                // render fields
                name = name + '<br><span class="small">' + club + "</span>";

                // calculate time fields
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
                    .append('<tr class="clickable-row" data-href="' +  href + '"><td>' + position + '</td><td>' + name + '</td><td align="right">' + time + '</td></tr>');
            }
        }
        // attach handler to clickable row
        var self = this;
        $(".clickable-row").on("click", function() {
            self.clickRow(this) 
        });
    };


    /**
     * clickRow
     */
    this.clickRow = function(that) {
        // make self
        var self = this;
        // extract vals to seach
        var vals = $(that).attr("data-href").split(",");
        // find a class
        this.$xml.find("ClassResult").each(function() {
            var className = $(this).find("Class").find("Name").text().replace(" ", "-");
            var length = $(this).find("Course > Length").text();
            var controls = $(this).find("Course > NumberOfControls").text();
            var runners = $(this).find("PersonResult").length;
            if (className == vals[0]) {
                console.log("Found correct class: " + className);
                // find the runner
                $(this).find("PersonResult").each(function() {
                    var given = $(this).find("Person").find("Name").find("Given").text();
                    var family = $(this).find("Person").find("Name").find("Family").text();
                    var name = given + " " + family;                    
                    if (name == vals[1]) {
                        console.log("Found correct runner: " + name);
                        self.generateRunnerResults(this, className, length, controls, runners);
                    }
                })
            }
        });
    }


    /**
     * generateRunnerResults
     * @param {xml} result Personal result, extracted from XML.
     */
    this.generateRunnerResults = function(result, className, length, controls, runners) {
        // extract data
        var given = $(result).find("Person").find("Name").find("Given").text();
        var family = $(result).find("Person").find("Name").find("Family").text();
        var name = given + " " + family;
        var club = $(result).find("Organisation").find("Name").text();
        var si = $(result).find("Result").find("ControlCard").text();
        var timesecs = parseInt($(result).find("Result > Time").text());
        var timeBehind = parseInt($(result).find("Result").find("TimeBehind").text());
        
        // extract status data
        var status = $(result).find("Result").find("Status").text();
        // convert statuses
        if (status == "DidNotFinish") status = "DNF";
        if (status == "MissingPunch") status = "MP";
        if (status == "DidNotStart") status= "DNS";

        var position = $(result).find("Result").find("Position").text();
        // calculate time fields
        time = this.formatTime(timesecs);
        timeBehind = this.formatTime(timeBehind);
        if (timeBehind != "0:00") timeBehind = "+" + timeBehind;
        if (status != "OK") {
            position = "";
            time = status;
            timeBehind = "--:--";
        }
       
        // time per km
        var perkm = "n/a";
        if ((length != 0) && (!isNaN(length))) {
            perkm = Math.round(timesecs / length * 1000);
            perkm = this.formatTime(perkm);
        }
        // extract card punches
        var splits = [];
        var splitCodes = [];

        $(result).find("Result > SplitTime").each(function() {
            splits.push(parseInt($(this).find("Time").text()));
            splitCodes.push($(this).find("ControlCode").text());
        });

        // add finish
        splits.push(timesecs);
        splitCodes.push("F");

        // log extracted information
        console.log(name, club, si, className, time, timeBehind, status, position, perkm, splits, splitCodes);

        // finally it is time render the results
        var sheet = $("#div-splits");
        sheet.empty();
        sheet.append(this.eventName + ", " + this.timeStamp.substring(0, 10) + "<br>");
        sheet.append("<b>Name:</b> " + name + " <i>(" + club + ")<br>");
        sheet.append("<b>SI:</b> " + si);
        sheet.append("<hr>");
        sheet.append("<b>Course:</b> " + className);
        if (status == "OK") sheet.append(", <b>Position:</b> " + position + "/" + runners);
        sheet.append("<br>");
        sheet.append("<b>Result:</b> " + time + " (" + timeBehind + ")");
        if (status == "OK") sheet.append(", " + perkm + " min/km");
        sheet.append("<br>");
        sheet.append("<br><b>Splits</b> <span class=\"no-print\">| <a href=\"javascript:results.printSheet();\">print</a></span><br>");
        sheet.append("<hr>");

        // render splits - n per row
        var n = 4; // TODO: this could go to config file
        var table = $("<table style=\"width: 100%\">");
        var tr = $('<tr>');
        for (var i in splits) {
            // insert a new line every n fields
            if (i % n == 0) {
                tr = $('<tr>');
            }
            // extract split time information and format it
            var cumTime = this.formatTime(splits[i]);
            var splitTime = cumTime;
            if (i > "0") splitTime = this.formatTime(splits[i] - splits[i - 1]);
            var splitCode = splitCodes[i];
            // calculate the sequence number of a control
            var ni = parseInt(i) + 1;
            // add data in the field
            tr.append("<td width=\"25%\" style=\"padding-bottom: 10px; text-align: right;\">" + (ni) + " (" + splitCode +")<br>" + 
                "<b>" + splitTime + "</b><br>" + 
                cumTime + " </td>");

            // if the row is full, then insert it into the table
            if (i % 4 == 3) {
                table.append(tr);
                // reset the row
                tr = null;
            }
        }
        // if the row was not inserted above (last line with incomplete number
        // of fields), then add it here
        table.append(tr);
        // add table to the DOM
        $("#div-splits").append(table);

        console.log(table);

        // at the end, display the layer and
        // create a click event on it, which closes the div
        $("#div-splits").on("click", function() {
            $("#div-splits").css("display", "none");
        });
        $("#div-splits").css("display", "block")
    }


    /**
     * printSheet
     * Prints the splits sheet.
     */
    this.printSheet = function() {
        console.log("Printing splits sheet.");
        // show the layer, if it gets closed by clicking on the layer
        $("#div-splits").show();
        // using printThis module for printing a HTML element
        $("#div-splits").printThis({
            importCSS: true,
            importStyle: true,            
            loadCSS: "print.css",            
            printContainer: false, 
        });        
    }


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

    // create a repeating timer to check the results every 30 seconds
    var interval = setInterval(function() {
        $.ajax({
            type: "GET",
            url: "results-IOFv3.xml",
            cache: false,
            dataType: "xml",
            success: results.loadXML,
            context: results
        });
    }, 30000);

});

