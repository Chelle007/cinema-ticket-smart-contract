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
    scheduleIds: Vec(Principal)
})
type Movie = typeof Movie.tsType;

const Schedule = Record({
    scheduleId: Principal,
    movieId: Principal,
    startTime: text,
    endTime: text,
    availableSeat: int32
})
type Schedule = typeof Schedule.tsType;

const CinemaTicketError = Variant({
    MovieDoesNotExist: Principal,
    NoAvailableSeat: text,
    NotPositiveInt: text,
    TimeFormatError: text,
    DurationError: text,
    ShowAmountError: text,
    ScheduleDoesNotExist: Principal
});
type CinemaTicketError = typeof CinemaTicketError.tsType;

let movieList = StableBTreeMap<Principal, Movie>(0);
let scheduleList = StableBTreeMap<Principal, Schedule>(1);

export default Canister({

    addMovie: update([text, nat32, int32, text, int32, int32], Result(Principal, CinemaTicketError), (name, price, durationMinutes, firstShowTime, showAmount, seatAmount) => {
        
        // CHECKING ERROR
        if (durationMinutes <= 0 || showAmount <= 0 || seatAmount <= 0) {
            return Err({
                NotPositiveInt: "durationMinutes, showAmount, seatAmount must be positive integer."
            })
        }
        if (isValidTimeFormat(firstShowTime) == false) {
            return Err({
                TimeFormatError: "Please use 'HH:mm' format to input firstShowTime."
            })
        }

        if (durationMinutes > 720) {
            return Err({
                DurationError: "The movie duration should be less than 12 hours(720 minutes)."
            })
        }

        const maxAmount = (timeToMinutes('24:00') - timeToMinutes(firstShowTime))/(durationMinutes+30); //add 30 minutes as break for cleaning the studio
        if (showAmount > maxAmount) {
            return Err({
                ShowAmountError: `The inputted amount exceeds the maximum show amount allowed for one day(${maxAmount}).`
            })
        }

        // INSERT TO MOVIELIST
        const movieId = generateId();
        let movie: Movie = {
            movieId,
            name,
            price,
            durationMinutes,
            firstShowTime,
            showAmount,
            seatAmount,
            scheduleIds: []
        }
        movieList.insert(movie.movieId, movie);
        
        // GENERATE SCHEDULE
        for (let i = 0; i<showAmount; i++) {
            const movieOpt = movieList.get(movieId);

            if ('None' in movieOpt) {
                return Err({
                    MovieDoesNotExist: movieId
                });
            }

            const movie = movieOpt.Some;

            const scheduleId = generateId();
            const startTime = minutesToTime(timeToMinutes(movie.firstShowTime) + i*(durationMinutes+30));
            const endTime = minutesToTime(timeToMinutes(startTime) + durationMinutes);
            const availableSeat = movie.seatAmount;
            
            const schedule: Schedule = {
                scheduleId,
                movieId,
                startTime,
                endTime,
                availableSeat
            };
            scheduleList.insert(schedule.scheduleId, schedule);

            const updatedMovie: Movie = {
                ...movie,
                scheduleIds: [...movie.scheduleIds, schedule.scheduleId]
            };

            movieList.insert(updatedMovie.movieId, updatedMovie);
        }

        return Ok(movie.movieId);
    }),

    deleteMovie: update([Principal], Result(Principal, CinemaTicketError), (movieId) => {
        const movieOpt = movieList.get(movieId);

        if ('None' in movieOpt) {
            return Err({
                MovieDoesNotExist: movieId
            });
        }

        const movie = movieOpt.Some;

        movie.scheduleIds.forEach((scheduleId) => {
            scheduleList.remove(scheduleId);
        })

        movieList.remove(movie.movieId);

        return Ok(movie.movieId);
    }),

    getMovieList: query([], Vec(Movie), () => {
        return movieList.values();
    }),

    getScheduleList: query([], Vec(Schedule), () => {
        return scheduleList.values();
    }),

    getMovieDetails: query([Principal], Opt(Movie), (movieId) => {
        return movieList.get(movieId);
    }),

    getScheduleDetails: query([Principal], Opt(Schedule), (scheduleId) => {
        return scheduleList.get(scheduleId)
    }),
    
    bookTicket: update([Principal, nat32], Result(Principal, CinemaTicketError), (scheduleId, seats) => {
        const scheduleOpt = scheduleList.get(scheduleId);
        if ('None' in scheduleOpt) {
            return Err({
                ScheduleDoesNotExist: scheduleId
            });
        }

        const schedule = scheduleOpt.Some;
        if (schedule.availableSeat < seats) {
            return Err({
                NoAvailableSeat: "No enough available seats."
            });
        }

        else {
            let updatedSchedule = schedule;
            updatedSchedule.availableSeat -= seats;
            scheduleList.insert(updatedSchedule.scheduleId, updatedSchedule);

            return Ok(updatedSchedule.scheduleId);
        }

    })
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