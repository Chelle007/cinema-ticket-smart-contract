import { text, int32, Canister, query, update, Void, Record } from 'azle';

export default Canister({

    addMovie: update([text, text, int32, text], Void, (_id, _name, _price, _availableSeat) => {
        const Movie = Record({
            id : text,
            name : text,
            price : int32,
            availableSeat : text
        })
    }),

    getMovieList: query([], text, () => {
        return movieList;
    }),

    getMovieDetails: query([], text, () => {
        return movie
    }),

    payTicket: update([], text, () => {
        return "success";
    })
});