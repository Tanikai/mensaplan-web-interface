let facility_param;
let date_param;
let refresh_param = false;
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

const CANTEEN_PARAM = "canteen";
const DATE_PARAM = "date";
const REFRESH_PARAM = "refresh";

function init() {
    parseURLAnchor();
    // console.log("new params:", {
    //     "canteen": facility_param,
    //     "date": date_param,
    //     "refresh": refresh_param,
    // });

    if (refresh_param === true) {
        fetch_data().then(show_plan);
        if (refresh_interval === undefined) {
            timedRefresh(10 * 60 * 1000); // every 10 minutes
            // timedRefresh(3 * 1000); // every 3 seconds
        }
    } else {
        if (refresh_interval !== undefined) {
            clearInterval(refresh_interval); // remove interval when url parameter is missing
            refresh_interval = undefined;
        }

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
        document.getElementById("day" + index).className += " active";
}

/*
* sets global variables facility, date, and refresh according to QueryParams in URL
*/
function parseURLAnchor() {
    const url = new URL(window.location.toLocaleString());
    const urlParams = new URLSearchParams(url.hash.substring(1)); // use hash instead of queryparams because parameters are passed inside hash
    let date = urlParams.get(DATE_PARAM);

    let canteen = urlParams.get(CANTEEN_PARAM);
    if (Object.values(canteens).includes(canteen)) {
        facility_param = canteen;
    } else {
        facility_param = "Mensa";
    }

    // Parse Date parameter
    switch (date) {
        case null: // If no date is given, use today's date
        case "today":
        case "heute":
            date_param = getDayString(0);
            break;
        case "tomorrow":
        case "morgen":
            date_param = getDayString(1);
            break;
        case "yesterday":
        case "gestern":
            date_param = getDayString(-1);
            break;
        case "next": {
            // shows today during opening hours,
            // tomorrow when facility is closed
            // (exact to one hour)
            const now = new Date().getHours();
            let closingTime = 14;
            if (facility_param === "bistro") closingTime = 19; // FIXME
            if (now < closingTime)
                date_param = getDayString(0);
            else
                date_param = getDayString(1);
        }
            break;
        default: {
            // try parsing the date
            let check = new Date(date);
            if (check instanceof Date && !isNaN(check.valueOf())) {
                date_param = date;
            } else {
                // failsafe
                date_param = getDayString(0);
            }
        }
            break;
    }

    let refresh = urlParams.get(REFRESH_PARAM);
    refresh_param = (refresh !== null) && (refresh.toLowerCase() === "true");
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
    if (refresh_interval !== undefined) return;

    refresh_interval = setInterval(() => {
        fetch_data().then(() => {
            setAnchor(facility_param, getDayString(0), refresh_param);
        });
    }, timeoutPeriod);
}

function getDayString(day_offset) {
    const day = new Date(new Date().getTime() + day_offset * 24 * 60 * 60 * 1000);
    return getISOStringOfDate(day);
}

function addDateToWeekdays(startDate, startIndex) {
    let today = getISOStringOfDate(new Date);
    let dateToAdd = startDate;
    for (let i = startIndex; i < startIndex + 5; i++) {
        daysArray[i] = getISOStringOfDate(dateToAdd);
        let dayToShow = dateToAdd.getDate();
        if (dayToShow <= 9) dayToShow = "0" + dayToShow;
        document.getElementById("day" + i).textContent = dayToShow + " " + document.getElementById("day" + i).textContent;
        if (daysArray[i] === today) {
            document.getElementById("day" + i).className += " today";
        }
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
    if (plan !== undefined && plan.meals !== undefined && plan.open === true) {
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

            let mealText = plan.meals[i].meal
            if (plan.meals[i].type != "" && plan.meals[i].type != null)
                mealText += ` (${plan.meals[i].type})`
            td.appendChild(document.createTextNode(mealText));
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
    // remove active class from buttons
    const today = getISOStringOfDate(new Date);
    for (let i = 0; i < 10; i++) {
        const button = document.getElementById("day" + i);
        let isToday = "";
        if (daysArray[i] === today) {
            isToday = " today";
        }
        button.className = `day${isToday}`;
    }
    // delete all meal frames from container
    $("div").remove(".meal-frame");
}

function setAnchor(facility, day, refresh) {
    if (refresh === true)
        window.location.assign(`#?${CANTEEN_PARAM}=${facility}&${DATE_PARAM}=${day}&${REFRESH_PARAM}=true`);
    else
        window.location.assign(`#?${CANTEEN_PARAM}=${facility}&${DATE_PARAM}=${day}`);
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
