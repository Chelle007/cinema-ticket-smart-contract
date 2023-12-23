# cinema_ticket_ICP

## Overview

Simple cinema movie ticketing using Azle in Typescript. The smart contract will generate the schedule for each movie added and allows user to book the ticket.

## Prerequisites

Follow these instructions from the [Azle Book](https://demergent-labs.github.io/azle/installation.html) to install all the required tools and set up your environment. You can skip this step if you have already installed the required tools.
After you have installed the required tools, you can move on to the next step.

### Installation

1. **Clone the repository:**
   ```bash
   https://github.com/Chelle007/cinema_ticket_ICP.git
   cd cinema_ticket_ICP

2. **Install dependencies:**
   ```bash
   npm install

3. **Start the local replica:**
   ```bash
   dfx start --clean --background

4. **Deploy the canister locally:**
   ```bash
   dfx deploy

## Functions

### `addMovie: update([text, nat32, int32, text, int32, int32], Result(Movie, CinemaTicketError), (name, price, durationMinutes, firstShowTime, showAmount, seatAmount)`

- Adds a movie into movie list.
- durationMinutes = movie duration in minutes, it must not exceed 12 hours(720 minutes).
- firstShowTime = the first schedule/start time of movie in a day. Must be inputted in 'HH:mm' format.
- showAmount = the amount of movie is played in a day.
- Generates schedule based on the durationMinutes, firstShowTime, and showAmount and add it to schedule list. Each show time is separated by 30 minutes for break/cleaning the studio.

### `deleteMovie: update([Principal], Result(Movie, CinemaTicketError), (movieId)`

- Deletes movie from movie list.
- Deletes the schedule of movie from schedule list.

### `getMovieList: query([], Vec(Movie), ()`

- Retrieves the list of movie.

### `getScheduleList: query([], Vec(Schedule), ()`

- Retrieves the list of schedule.
    
### `getMovieDetails: query([Principal], Opt(Movie), (movieId)`

- Retrieves the details of movie (id, name, price, duration in minutes, first show time, show amount, seat amount).

### `getScheduleDetails: query([Principal], Opt(Schedule), (scheduleId)`

- Retrieves the details of schedule (id, movie id, start time, end time, available seats)

### `bookTicket: update([Principal, int32], Result(Schedule, CinemaTicketError), (scheduleId, seats)`

- Books ticket for movie in specific schedule. User can input the amount of seats that user want to book, but can not exceed the amount of available seats.
- Reduces the amount of available seats based on the amount of seats that is booked.
