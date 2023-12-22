import {
    Canister,
    query,
    update,
    Record,
    text,
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
    id: Principal,
    name: text,
    price: int32,
    availableSeats: int32,
})
type Movie = typeof Movie.tsType;

const CinemaTicketError = Variant({
    MovieDoesNotExist: Principal,
    NoAvailableSeat: text
});
type CinemaTicketError = typeof CinemaTicketError.tsType;

let movieList = StableBTreeMap<Principal, Movie>(0);

export default Canister({

    addMovie: update([text, int32, int32], Movie, (name, price, availableSeats) => {
        const id = generateId();
        const movie: Movie = {
            id,
            name,
            price,
            availableSeats,
        }
        movieList.insert(movie.id, movie);

        return movie;
    }),

    deleteMovie: update([Principal], Result(Movie, CinemaTicketError), (id) => {
        const movieOpt = movieList.get(id);

        if ('None' in movieOpt) {
            return Err({
                MovieDoesNotExist: id
            });
        }

        const movie = movieOpt.Some;

        movieList.remove(movie.id);

        return Ok(movie);
    }),

    getMovieList: query([], Vec(Movie), () => {
        return movieList.values();
    }),

    getMovieDetails: query([Principal], Opt(Movie), (id) => {
        return movieList.get(id)
    }),

    bookTicket: update([Principal, int32], Result(Movie, CinemaTicketError), (id, seats) => {
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
});

function generateId(): Principal {
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}