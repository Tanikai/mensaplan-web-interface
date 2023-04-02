let facility_param;
let date_param;
let refresh_param;
let daysArray = [];
// HTML Tag : API
const canteens = {
    "Mensa Uni Süd": "Mensa",
    "Cafeteria Nord": "Bistro",
    "Cafeteria Uni West": "West",
    "Westside Diner": "Diner",
    "Burger Bar": "Burgerbar",
    // "Mensa Hochschule": "Prittwitzstr",
    // "Cafeteria Hochschulleitung": "Hochschulleitung",
    // "Hochschule Oberer Eselsberg": "HSOE",
    // "Cafeteria B": "CB"
};
const urlJSON = "https://uulm.anter.dev/api/v1/mensaplan.json";
const urlStaticJSON = "./data/mensaplan_static.json";
let mensa_plan;
let static_plan;
let refresh_interval = undefined;

function init() {
    parseAnchor();

    if ((refresh_param !== undefined) && (refresh_interval === undefined)) {
        fetch_data().then(show_plan);
        timedRefresh(10 * 60 * 1000); // every 10 minutes
    } else {
        if ((mensa_plan === undefined) || (static_plan === undefined)) {
            fetch_data().then(show_plan);
        } else {
            show_plan();
        }
    }
}

function fetch_data() {
    return Promise.all([
        $.getJSON(urlJSON, (data) => {
            mensa_plan = data;
        }),
        $.getJSON(urlStaticJSON, function (data) {
            static_plan = data;
        })
    ]);
}

function show_plan() {
    let noOfWeeks = 1;
    while (mensa_plan.weeks[noOfWeeks] !== undefined) noOfWeeks++;

    const coordinates = getCoordinatesInJSON(date_param, mensa_plan, noOfWeeks);

    date_param = coordinates.date;

    reset();

    if (daysArray[0] === undefined) {
        //do this only when landing on page
        initDaysList(mensa_plan, noOfWeeks);
    }

    if (!(facility_param === "Diner" || facility_param === "Burgerbar")) {
        if (coordinates.found === true) {
            printPlan(mensa_plan.weeks[coordinates.week].days[coordinates.day][facility_param]);
        }
    } else
        // static food plan -> different file
    {
        let weekday = new Date(date_param).getDay() - 1;

        if (weekday === -1 || weekday === 5) {
            // weekend--> show monday
            weekday = 0;
        }

        printPlan(static_plan.weeks[0].days[weekday][facility_param]);
    }

    selectFacilityInDropdown();

    const index = daysArray.indexOf(date_param);
    if (index !== -1)
        document.getElementById("day" + index).className = "day active";
}

/*
* sets global variables facility, date, and refresh according to anchor
*/
function parseAnchor() {
    const anchor = window.location.hash.substr(1);
    if (anchor === "") { // default: Mensa, today
        facility_param = 'Mensa';
        date_param = getDayString(0);
    } else {
        facility_param = anchor.split('&')[0];
        date_param = anchor.split('&')[1];
        refresh_param = anchor.split('&')[2];
        if (date_param === "today" || date_param === "heute" || date_param === undefined)
            date_param = getDayString(0);
        if (date_param === "tomorrow" || date_param === "morgen")
            date_param = getDayString(1);
        if (date_param === "yesterday" || date_param === "gestern")
            date_param = getDayString(-1);
        if (date_param === "next")// shows today's plan during opening hours,
            // tomorrows when facility is closed
            // (exact to one hour)
        {
            const now = new Date().getHours();
            let closingTime = 14;
            if (facility_param === "bistro") closingTime = 19;
            if (now < closingTime)
                date_param = getDayString(0);
            else
                date_param = getDayString(1);
        }
    }
}

function initDaysList(data, noOfWeeks) {
    if (noOfWeeks >= 2) {
        let mon1 = getDateOfISOWeek(data.weeks[0].weekNumber);
        let mon2 = getDateOfISOWeek(data.weeks[1].weekNumber);
        if (mon2 < mon1) {
            let tmp = mon1;
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
    const originalDate = date;
    let found = false;
    let week, day;
    for (let k = 0; k < 3; k++) {
        for (let i = 0; i < noOfWeeks; i++) {
            for (let j = 0; j < data.weeks[i].days.length; j++) {
                if (data.weeks[i].days[j].date === date) {
                    found = true;
                    week = i;
                    day = j;
                }
            }
        }
        if (found === false) { //closed today, maybe plan for tomorrow?
            date = getISOStringOfDate(new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000));
        } else break;
    }

    if (found === false) {
        // failsafe: requested date and the next two days not
        // found, try today. If that doesn't work either
        // just take the first one.
        const today = getISOStringOfDate(new Date());
        if (date !== today && originalDate !== today) {
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
    refresh_interval = setInterval(() => {
        console.log("refreshed", new Date());
        fetch_data().then(init);
    }, timeoutPeriod);
}

function getDayString(offset) {
    const day = new Date(new Date().getTime() + offset * 24 * 60 * 60 * 1000);
    return getISOStringOfDate(day);
}

function addDateToWeekdays(startDate, startIndex) {
    let dateToAdd = startDate;
    for (let i = startIndex; i < startIndex + 5; i++) {
        daysArray[i] = getISOStringOfDate(dateToAdd);
        let dayToShow = dateToAdd.getDate();
        if (dayToShow <= 9) dayToShow = "0" + dayToShow;
        document.getElementById("day" + i).textContent = dayToShow + " " + document.getElementById("day" + i).textContent;
        dateToAdd = new Date(dateToAdd.getTime() + 24 * 60 * 60 * 1000);
    }
}

function selectFacilityInDropdown() {
    let sel = document.getElementById("mensa-select");
    const val = document.getElementById("facility" + facility_param).value;
    for (let i = 0, j = sel.options.length; i < j; ++i) {
        if (sel.options[i].innerHTML === val) {
            sel.selectedIndex = i;
            break;
        }
    }
}

function printPlan(plan) {
    const oldTable = document.getElementById('plan'),
        newTable = oldTable.cloneNode(true);
    if (plan !== undefined && plan.meals !== undefined) {
        for (let i = 0; i < plan.meals.length; i++) {
            const tr = document.createElement('div');
            tr.className = "meal-frame";

            let td = document.createElement('div');
            td.className = "category";
            const h2 = document.createElement("h2");
            h2.textContent = plan.meals[i].category;
            td.appendChild(h2);
            tr.appendChild(td);
            td = document.createElement('div');
            td.className = "meal";
            td.appendChild(document.createTextNode(plan.meals[i].meal));
            tr.appendChild(td);
            td = document.createElement('div');
            td.className = "price";
            if (plan.meals[i].price !== undefined)
                td.appendChild(document.createTextNode(plan.meals[i].price));
            tr.appendChild(td);
            newTable.appendChild(tr);
        }
    } else {
        let tr = document.createElement('div');
        tr.className = "meal-frame";
        let td = document.createElement('div');
        td.className = "category";
        td.appendChild(document.createTextNode("geschlossen"));
        tr.appendChild(td);
        newTable.appendChild(tr);
    }
    oldTable.parentNode.replaceChild(newTable, oldTable);
}

document.getElementById("mensa-select").onchange = function () {
    facility_param = canteens[this.value];
    setAnchor(facility_param, date_param, refresh_param);
};

function openDay(idx) {
    date_param = daysArray[idx];
    setAnchor(facility_param, date_param, refresh_param);
}

function getISOStringOfDate(date2) {
    let dd = date2.getDate();
    let mm = date2.getMonth() + 1; //January is 0

    if (dd < 10) {
        dd = '0' + dd
    }

    if (mm < 10) {
        mm = '0' + mm
    }

    let yyyy = date2.getFullYear();
    return yyyy + '-' + mm + '-' + dd;
}

function getDateOfISOWeek(weekNumber) {
    const year = new Date().getFullYear();
    const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    const dayOfWeek = simple.getDay();
    let ISOweekStart = simple;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function reset() {
    for (let i = 0; i < 10; i++) {
        document.getElementById("day" + i).className = "day";
    }
    $("div").remove(".meal-frame");
}

function setAnchor(facility, day, refresh) {
    if (refresh !== undefined)
        window.location.assign('#' + facility + "&" + day + "&refresh");
    else
        window.location.assign('#' + facility + "&" + day);
}

/*
* Functions for touch and keyboard navigation
* direction: -1 for yesterday, 1 for tomorrow
*/
function adjacentDay(direction) {
    for (let i = 0; i < 3; i++) {
        const day = getISOStringOfDate(new Date(new Date(date_param).getTime() + direction * (i + 1) * 24 * 60 * 60 * 1000));
        if ($.inArray(day, daysArray) !== -1) {
            setAnchor(facility_param, day, refresh_param);
            break;
        }
    }
}

// left/right swipe on mobile
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

let xDown = null;
let yDown = null;

function handleTouchStart(evt) {
    xDown = evt.touches[0].clientX;
    yDown = evt.touches[0].clientY;
}

function handleTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    const xUp = evt.touches[0].clientX;
    const yUp = evt.touches[0].clientY;

    const xDiff = xDown - xUp;
    const yDiff = yDown - yUp;

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
}

// left/right keyboard input
function pressed(e) {
    const cxc = e.keyCode;
    if (cxc == 37 || cxc == 39) {
        e.preventDefault();
        if (cxc == 37)//left
            adjacentDay(-1);
        if (cxc == 39)//right
            adjacentDay(1);
    }
}
