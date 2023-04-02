var facility;
var date;
var refresh;
var daysArray = [];
var mensen = {
    "Mensa Uni": "Mensa",
    "Bistro": "Bistro",
    "Cafeteria West": "West",
    "WestSideDiner": "Diner",
    "Burgerbar Cafeteria SouthSide": "Burgerbar",
    "Mensa Hochschule": "Prittwitzstr",
    "Cafeteria Hochschulleitung": "Hochschulleitung",
    "Hochschule Oberer Eselsberg": "HSOE",
    "Cafeteria B": "CB"
};
var weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Mo", "Di", "Mi", "Do", "Fr"];
var urlJSON = "https://uulm.anter.dev/api/v1/mensaplan.json";
var urlStaticJSON = "./data/mensaplan_static.json";

function init() {

    parseAnchor();

    if (refresh != undefined) timedRefresh(10 * 60 * 1000); //every 10 minutes

    $.getJSON(urlJSON, (data) => {

        var noOfWeeks = 1;
        while (data.weeks[noOfWeeks] != undefined) noOfWeeks++;

        var coordinates = getCoordinatesInJSON(date, data, noOfWeeks);

        date = coordinates.date;

        reset();

        if (daysArray[0] == undefined) {
            //do this only when landing on page
            initDaysList(data, noOfWeeks);
        }

        if (!(facility == "Diner" || facility == "Burgerbar")) {
            if (coordinates.found == true) {
                printPlan(data.weeks[coordinates.week].days[coordinates.day][facility]);
            }
        }
        else
        // static food plan -> different file
        {
            $.getJSON(urlStaticJSON, function (staticData) {

                weekday = new Date(date).getDay() - 1;

                if (weekday == -1 || weekday == 5) {
                    // weekend--> show monday
                    weekday = 0;
                }

                printPlan(staticData.weeks[0].days[weekday][facility]);
            });
        }

        selectFacilityInDropdown();

        var index = daysArray.indexOf(date);
        if (index != -1)
            document.getElementById("day" + index).className = "day active";
    });
}

/*
    * sets global variables facility, date, and refresh according to anchor
    */
function parseAnchor() {
    var anchor = window.location.hash.substr(1);
    if (anchor == "") { // default: Mensa, today
        facility = 'Mensa';
        date = getDayString(0);
    } else {
        facility = anchor.split('&')[0];
        date = anchor.split('&')[1];
        refresh = anchor.split('&')[2];
        if (date == "today" || date == "heute" || date == undefined)
            date = getDayString(0);
        if (date == "tomorrow" || date == "morgen")
            date = getDayString(1);
        if (date == "yesterday" || date == "gestern")
            date = getDayString(-1);
        if (date == "next")// shows today's plan during opening hours, 
        // tomorrows when facility is closed 
        // (exact to one hour)
        {
            var now = new Date().getHours();
            var closingTime = 14;
            if (facility == "bistro") closingTime = 19;
            if (now < closingTime)
                date = getDayString(0);
            else
                date = getDayString(1);
        }
    }
}

function initDaysList(data, noOfWeeks) {
    if (noOfWeeks >= 2) {
        var mon1 = getDateOfISOWeek(data.weeks[0].weekNumber);
        var mon2 = getDateOfISOWeek(data.weeks[1].weekNumber);
        if (mon2 < mon1) { 
            var tmp = mon1;
            mon1 = mon2;
            mon2 = tmp;
        }
        addDateToWeekdays(mon1, 0);
        addDateToWeekdays(mon2, 5);
    } else {
        document.getElementById('2ndWeek').style.display = "none";
        document.getElementById('separator').style.display = "none";
        document.getElementById('1stWeek').style.width = "100%";
        addDateToWeekdays(getDateOfISOWeek(data.weeks[0].weekNumber), 0);
    }
}

function getCoordinatesInJSON(date, data, noOfWeeks) {
    var originalDate = date;
    var found = false;
    for (k = 0; k < 3; k++) {
        for (i = 0; i < noOfWeeks; i++) {
            for (j = 0; j < data.weeks[i].days.length; j++) {
                if (data.weeks[i].days[j].date == date) {
                    found = true;
                    week = i;
                    day = j;
                }
            }
        }
        if (found == false) {//closed today, maybe plan for tomorrow?
            date = getISOStringOfDate(new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000));
        }
        else break;
    }
    if (found == false) {
        // failsafe: requested date and the next two days not
        // found, try today. If that doesn't work either
        // just take the first one.
        today = getISOStringOfDate(new Date());
        if (date != today && originalDate != today) {
            return getCoordinatesInJSON(today, data, noOfWeeks);
        } else {
            return {
                "week": 0,
                "day": 0,
                "date": date,
                "found": found
            };
        }
    }
    return {
        "week": week,
        "day": day,
        "date": date,
        "found": found
    };
}

function timedRefresh(timeoutPeriod) {
    setInterval("init();", timeoutPeriod);
}

function getDayString(offset) {
    var day = new Date(new Date().getTime() + offset * 24 * 60 * 60 * 1000);
    return getISOStringOfDate(day);
}

function addDateToWeekdays(startDate, startIndex) {
    var dateToAdd = startDate;
    for (i = startIndex; i < startIndex + 5; i++) {
        daysArray[i] = getISOStringOfDate(dateToAdd);
        var dayToShow = dateToAdd.getDate();
        if (dayToShow <= 9) dayToShow = "0" + dayToShow;
        document.getElementById("day" + i).textContent = dayToShow + " " + document.getElementById("day" + i).textContent;
        dateToAdd = new Date(dateToAdd.getTime() + 24 * 60 * 60 * 1000);
    }
}

function selectFacilityInDropdown() {
    var sel = document.getElementById("mensa-select");
    var val = document.getElementById("facility" + facility).value;
    for (var i = 0, j = sel.options.length; i < j; ++i) {
        if (sel.options[i].innerHTML === val) {
            sel.selectedIndex = i;
            break;
        }
    }
}

function printPlan(plan) {
    var oldTable = document.getElementById('plan'),
        newTable = oldTable.cloneNode(true);
    if (plan != undefined && plan.meals != undefined) {
        for (var i = 0; i < plan.meals.length; i++) {
            var tr = document.createElement('div');
            tr.className = "meal-frame";
            var mealWidth = "100%";
            if (plan.meals[i].contains != undefined) {
                var img = document.createElement('img');
                img.src = "img/" + plan.meals[i].contains + ".png";
                img.alt = "This meal contains " + plan.meals[i].contains + ".";
                img.className = "contains";
                mealWidth = "90%";
                tr.appendChild(img);
            }
            var td = document.createElement('div');
            td.className = "category";
            td.appendChild(document.createTextNode(plan.meals[i].category));
            tr.appendChild(td);
            var td = document.createElement('div');
            td.className = "meal";
            td.appendChild(document.createTextNode(plan.meals[i].meal));
            td.style.width = mealWidth;
            tr.appendChild(td);
            var td = document.createElement('div');
            td.className = "price";
            if (plan.meals[i].price != undefined)
                td.appendChild(document.createTextNode(plan.meals[i].price));
            tr.appendChild(td);
            newTable.appendChild(tr);
        }
    } else {
        var tr = document.createElement('div');
        tr.className = "meal-frame";
        var mealWidth = "100%";
        var td = document.createElement('div');
        td.className = "category";
        td.appendChild(document.createTextNode("geschlossen"));
        tr.appendChild(td);
        newTable.appendChild(tr);
    }
    oldTable.parentNode.replaceChild(newTable, oldTable);
}

document.getElementById("mensa-select").onchange = function () {
    facility = mensen[this.value];
    setAnchor(facility, date, refresh);
};

function openDay(idx) {
    date = daysArray[idx];
    setAnchor(facility, date, refresh);
}

function getISOStringOfDate(date2) {
    var dd = date2.getDate();
    var mm = date2.getMonth() + 1; //January is 0

    if (dd < 10) {
        dd = '0' + dd
    }

    if (mm < 10) {
        mm = '0' + mm
    }

    var yyyy = date2.getFullYear();
    return yyyy + '-' + mm + '-' + dd;
}

function getDateOfISOWeek(weekNumber) {
    var year = new Date().getFullYear();
    var simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    var dayOfWeek = simple.getDay();
    var ISOweekStart = simple;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function reset() {
    for (i = 0; i < 10; i++) {
        document.getElementById("day" + i).className = "day";
    }
    $("div").remove(".meal-frame");
}

function setAnchor(facility, day, refresh) {
    if (refresh != undefined)
        window.location.assign('#' + facility + "&" + day + "&refresh");
    else
        window.location.assign('#' + facility + "&" + day);
}

/*
    * Functions for touch and keyboard navigation
    */
// direction: -1 for yesterday, 1 for tomorrow
function adjacentDay(direction) {
    for (i = 0; i < 3; i++) {
        var day = getISOStringOfDate(new Date(new Date(date).getTime() + direction * (i + 1) * 24 * 60 * 60 * 1000));
        if ($.inArray(day, daysArray) != -1) {
            setAnchor(facility, day, refresh);
            break;
        }
    }
}

// left/right swipe on mobile

document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

var xDown = null;
var yDown = null;

function handleTouchStart(evt) {
    xDown = evt.touches[0].clientX;
    yDown = evt.touches[0].clientY;
};

function handleTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) { // ignore up / down swipe
        if (xDiff > 0) {
            adjacentDay(1);
        } else {
            adjacentDay(-1);
        }
    }

    // reset values
    xDown = null;
    yDown = null;
};

// left/right keyboard input
function pressed(e) {
    cxc = e.keyCode;
    if (cxc == 37 || cxc == 39) {
        e.preventDefault();
        if (cxc == 37)//left
            adjacentDay(-1);
        if (cxc == 39)//right
            adjacentDay(1);
    }
}
