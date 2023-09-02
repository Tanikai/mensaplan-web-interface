# Ulm University Mensaplan

This project contains a web UI for the daily canteen plans at Ulm University. The following canteens are supported:

- Mensa Uni Süd
- Cafeteria Nord
- Burgerbar
- Cafeteria West
- Westside Diner

This project was forked from 
[github.com/seder/mensaplan-web-interface](https://github.com/seder/mensaplan-web-interface)
and contains some improvements. See section [Changes](#changes) for more details.

## Try it out

- [mensaplan2.anter.dev](https://mensaplan2.anter.dev) for today's plan.
- [mensaplan2.anter.dev/#Mensa&today&refresh](https://mensaplan2.anter.dev/#Mensa&today&refresh) for automatic page
  refresh, e.g. for kiosk usage.

## URL structure

The plan can be configured by setting the anchor or by using the UI elements, which in turn change the anchor.

The anchor is structured as follows: `base_url/#<query_str>` where `<query_str>` is
a [query string](https://en.wikipedia.org/wiki/Query_string). There are three (order independent) parameters:

- `canteen` (String)
- `date` (String, formatted in YYYY-MM-DD)
- `reload` (Boolean)

Please note the `#` in front of the query string. This allows navigating / refreshing the website without sending a
request to the server every time.

### Canteen

The `canteen` parameter has the data type String. The following canteens are supported / allowed:

- `Mensa` (Mensa Uni Süd)
- `Bistro` (Cafeteria Nord)
- `Burgerbar` (Burgerbar at Cafeteria Southside)
- `West` (Cafeteria West)
- `Diner` (Westside Diner)

If no argument is given, Mensa Süd will be used as default.

### Date

The `date` parameter has the data type String. The date has to be in the format `YYYY-MM-DD` (ISO 8601) or one of the
following keywords:

- `tomorrow`
- `morgen`
- `yesterday`
- `today`
- `heute`
- `gestern`
- `next`

Note:

- If no argument is given, `today`/`heute` will be used as default.
- `next` means, that the plan of the mensa will be shown of the next time the facility is open. So during or before
  opening hours, today's plan and after the facility closes tomorrow's plan (or the plan for the next day the facility
  opens). 
- In any case: if the canteen is closed at that day, the data from the next time it is open will be shown, given that
  the data is present.

### Refresh

If the parameter `refresh` is set to `true`, the plan will be refreshed every ten minutes. This can be used for static
displays / kiosks, e.g. in the institute coffee kitchen or the student union office.

## Examples

>base_url

Does the same as

>base_url/#?canteen=Mensa&date=today

>base_url/#?canteen=Mensa&date=heute

and the same as

>base_url/#?canteen=Mensa&date=next

during and before opening hours and

>base_url/#?canteen=Mensa&date=YYYY-MM-DD

where YYYY-MM-DD is today's date.

## Changes

- Reduced API call count from every day change to once at beginning
- Changed data source to [uulm.anter.dev/api/v1/mensaplan.json](https://uulm.anter.dev/api/v1/mensaplan.json) with better PDF parser
- Improved UI based on some [Material 3 principles](https://m3.material.io/)
- General refactoring of JavaScript code
- Changed URL Query string parsing to be order independent

## Alternatives

- [Mensa TUI](https://github.com/LukasPietzschmann/uulm-mensa-tui): If you are a terminal lover, you can also use the terminal application a friend of mine wrote

## Contact

Kai Anter - [www.anter.dev](https://www.anter.dev) - [Mastodon](https://hachyderm.io/@Tanikai)
