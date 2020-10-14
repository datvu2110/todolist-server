create table users(
id serial primary key,
name varchar(100),
email text unique not null,
);