import * as request from 'request-promise';
import * as jQuery from 'jquery';
import * as jsdom from 'jsdom';
import { exec } from 'child_process';

const $ = jQuery(new jsdom.JSDOM().window);


const musorUrl = 'https://musor.tv/napi/tvmusor/MR1/2018.10.19';

interface ShowInterface {
    startDate: Date;
    endDate: Date | null;
    name: string;
    description: string;
}

interface DateTimeInterface {
    year: string;
    month: string;
    days: string;
    hours: string;
    minutes: string;
}

// Napi műsorok listája, visszatérés nevével, kezdetével, végével
class KossuthParser {
    requestDate : Date;
    wantedShows : Array<string>;

    constructor (requestDate : Date, wantedShows : Array<string>) {
        this.requestDate = requestDate;
        this.wantedShows = wantedShows;
        this.grabShows();
    }

    private grabShows() : void {
        this.getSelectedShows(this.wantedShows).then(selectedShows => {
            selectedShows.forEach(show => {
                this.downloadShow(show);
                console.log(`downloaded: ${show.name}`);
            });
        });
    }

    private downloadShow(show : ShowInterface) : void {
        const startDate : DateTimeInterface = this.getDateTime(show.startDate),
              endDate : DateTimeInterface   = this.getDateTime(show.endDate);

        const streamUrl = `https://hangtar-cdn.connectmedia.hu/${startDate.year}${startDate.month}${startDate.days}${startDate.hours}${startDate.minutes}00/${endDate.year}${endDate.month}${endDate.days}${endDate.hours}${endDate.minutes}00/mr1.mp3`;
        const file = `../podcast/radiokabare/${startDate.year}${startDate.month}${startDate.days}_${startDate.hours}${startDate.minutes}00_1.mp3`;

        exec(`wget ${streamUrl} -O ${file}`);
    }

    private getDateTime(currDate : Date) : DateTimeInterface {
        let _year : number = currDate.getFullYear(),
            _month : number = currDate.getMonth()+1,
            _day : number = currDate.getDate(),
            _hours : number = currDate.getHours(),
            _minutes : number = currDate.getMinutes();

        let days : string,
            month : string,
            hours : string,
            minutes: string;

        month = _month.toString();
        if (_month < 10) {
            month = '0' + _month.toString();
        }

        days = _day.toString();
        if (_day < 10) {
            days = '0' + _day.toString();
        }

        hours = _hours.toString();
        if (_hours < 10) {
            hours = '0' + _hours.toString();
        }

        minutes = _minutes.toString();
        if (_minutes < 10) {
            minutes = '0' + _minutes.toString();
        }

        return {
            year: _year.toString(),
            month: month,
            days: days,
            hours: hours,
            minutes: minutes
        }
    }

    // url content loader : jQuery
    private loadShows() : Promise<object> {
        const headers : object = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0',
            'Content-Type' : 'application/x-www-form-urlencoded'
        };

        return this.request(this.renderEpgUrl(), headers)
            .then(body => {
                let shows : Array<ShowInterface> = [];

                $.each($(body).find('[itemtype="https://schema.org/BroadcastEvent"]'), (index : number, program : string) => {
                    const show : ShowInterface = {
                        startDate: new Date($(program).find('[itemprop="startDate"]').attr('content')),
                        endDate: null,
                        name: $(program).find('[itemprop="name"] a').html(),
                        description: $(program).find('[itemprop="description"]').html()
                    };
                    shows.push(show);
                });

                shows = this.renderEndDate(shows);

                return shows;
            });
    }

    private renderEndDate(shows : Array<ShowInterface>) : Array<ShowInterface> {
        shows.forEach((show, i) => {
            const currShow : ShowInterface = show;
            const nextShow : ShowInterface = shows[i + 1];

            if (typeof nextShow != "undefined") {
                currShow.endDate = nextShow.startDate;
            }
            else {
                const endDateD : Date = currShow.startDate;
                endDateD.setHours(endDateD.getHours() + 1);
                currShow.endDate = endDateD;
            }
        });

        return shows;
    }

    private request (uri : string, headers : object) : Promise<object> {
        const options : object = {
            uri: uri,
            headers: headers,
            method: 'GET'
        };

        return request(options)
            .then(  body => {
                return body
            })
            .catch(err => {
                new Error(err);
            });
    }

    private renderEpgUrl() : string {
        const currDate : DateTimeInterface = this.getDateTime(this.requestDate);

        // Ez alapján => https://musor.tv/napi/tvmusor/MR1/2018.10.19
        return `https://musor.tv/napi/tvmusor/MR1/${currDate.year}.${currDate.month}.${currDate.days}`;
    }

    // Megkeressük a kívánt műsorokat
    private getSelectedShows(wantedShows : Array<string>) {
        const selectedShows : Array<ShowInterface> = [];

        // Keresés a már eddig be grub-elt műsorok között név szerint
        const showIsExist = showName => {
            for (let i = 0; i < selectedShows.length; i++) {
                if (selectedShows[i].name === showName) {
                    return true;
                }
            }
            return false;
        };

        return this.loadShows().then(shows => {
            (<Array<ShowInterface>> shows).forEach(show => {
                wantedShows.forEach(wantedElement => {
                    if (show.name.indexOf(wantedElement) != -1) {
                        // duplikáció kiszűrése
                        if (!showIsExist(wantedElement)) {
                            selectedShows.push(show);
                        }
                    }
                });
            });
            return selectedShows;
        });
    }
}

export default KossuthParser;
