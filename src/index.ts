import {
    Canister,
    update,
    query,
    Record,
    text,
    nat32,
    bool,
    int32,
    StableBTreeMap,
    Err,
    Result,
    Variant,
    Principal,
    Ok,
    Vec,
    Opt
} from 'azle';

const Movie = Record({
    movieId: Principal,
    name: text,
    price: nat32,
    durationMinutes: int32,
    firstShowTime: text,
    showAmount: int32,
    seatAmount: int32,
})
type Movie = typeof Movie.tsType;

const Schedule = Record({
    scheduleId: Principal,
    movieId: Principal,
    startTime: text,
    endTime: text,
    availableSeat: int32,
    validity: bool,
})
type Schedule = typeof Schedule.tsType;

const CinemaTicketError = Variant({
    MovieDoesNotExist: Principal,
    NoAvailableSeat: text,
    notPositiveInt: text,
    timeFormatError: text,
    durationError: text,
    showAmountError: text
});
type CinemaTicketError = typeof CinemaTicketError.tsType;

let movieList = StableBTreeMap<Principal, Movie>(0);
let scheduleList = StableBTreeMap<Principal, Schedule>(0);

export default Canister({

    addMovie: update([text, nat32, int32, text, int32, int32], Result(Principal, CinemaTicketError), (name, price, durationMinutes, firstShowTime, showAmount, seatAmount) => {
        
        // CHECKING ERROR
        if (durationMinutes <= 0 || showAmount <= 0 || seatAmount <= 0) {
            return Err({
                notPositiveInt: "durationMinutes, showAmount, seatAmount must be positive integer."
            })
        }
        if (isValidTimeFormat(firstShowTime) == false) {
            return Err({
                timeFormatError: "Please use 'HH:mm' format to input firstShowTime."
            })
        }

        if (durationMinutes > 720) {
            return Err({
                durationError: "The movie duration should be less than 12 hours(720 minutes)."
            })
        }

        const maxAmount = (timeToMinutes('24:00') - timeToMinutes(firstShowTime))/(durationMinutes+30); //add 30 minutes as break for cleaning the studio
        if (showAmount > maxAmount) {
            return Err({
                showAmountError: `The inputted amount exceeds the maximum show amount allowed for one day(${maxAmount}).`
            })
        }

        // INSERT TO MOVIELIST
        const movieId = generateId();
        const movie: Movie = {
            movieId,
            name,
            price,
            durationMinutes,
            firstShowTime,
            showAmount,
            seatAmount
        }
        movieList.insert(movieId, movie);

        // GENERATE SCHEDULE
        for (let i = 0; i<showAmount; i++) {
            const scheduleId = generateId();
            const startTime = minutesToTime(timeToMinutes(firstShowTime) + i*(durationMinutes+30));
            const endTime = minutesToTime(timeToMinutes(startTime) + durationMinutes);
            const schedule: Schedule = {
                scheduleId,
                movieId,
                startTime,
                endTime,
                availableSeat : seatAmount,
                validity : true,
            }
            scheduleList.insert(scheduleId, schedule);
        }

        return Ok(movie.movieId);
    }),

    deleteMovie: update([Principal], Result(Movie, CinemaTicketError), (movieId) => {
        const movieOpt = movieList.get(movieId);
        if ('None' in movieOpt) {
            return Err({
                MovieDoesNotExist: movieId
            });
        }
        const movie = movieOpt.Some;
        movieList.remove(movie.movieId);

        const allSchedule = scheduleList.values();
        const filteredSchedule = allSchedule.filter(
            (schedule: typeof Schedule) =>
            schedule.movieId == movieId
        );

        return Ok(movie.movieId);
    }),

    getMovieList: query([], Vec(Movie), () => {
        return movieList.values();
    }),

    getScheduleList: query([], Vec(Schedule), () => {
        return scheduleList.values();
    }),

    getMovieDetails: query([Principal], Opt(Movie), (id) => {
        return movieList.get(id);
    }),

    getMovieSchedule: query([Principal], Opt(Schedule), (id) => {
        return scheduleList.get(id); //not finished
    }),

    /*
    bookTicket: update([Principal, nat32], Result(Movie, CinemaTicketError), (id, seats) => {
        const movieOpt = movieList.get(id);
        if ('None' in movieOpt) {
            return Err({
                MovieDoesNotExist: id
            });
        }

        const movie = movieOpt.Some;
        if (movie.availableSeats < seats) {
            return Err({
                NoAvailableSeat: "No enough available seats."
            });
        }

        else {
            let newmovie = movie;
            newmovie.availableSeats -= seats;
            movieList.remove(movie.id);
            movieList.insert(newmovie.id, newmovie);

            return Ok(newmovie);
        }

    })
    */
});

function generateId(): Principal {
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}

function isValidTimeFormat(time: text): boolean {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

    return timeRegex.test(time);
}

function timeToMinutes(time: text): int32 {
    const [hours, minutes] = time.split(':').map(Number);
    return hours*60 + minutes;
}

function minutesToTime(minutes: any): text {
    let hours : any = Math.floor(minutes/60);
    minutes -= 60*hours;

    if (hours < 10) {
        hours = '0' + hours;
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }

    return `${hours}:${minutes}`;
}