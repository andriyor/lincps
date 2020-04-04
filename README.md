# lincps

[![version][version-badge]][package]

LinkedIn company profile statistics

## Installation

``npm i -g lincps``

## Usage 

Pass linkedin e-mail and password via cli args or store it on LINCA_EMAIL and LINCA_PASSWORD envirorment variables. I recommend to not use your primary profile since it may be blocked.

```bash
node dist/lincps.js --help                                              

  Examples
    $ lincps --url https://www.linkedin.com/company/spd-ukraine/
    $ lincps --url https://www.linkedin.com/company/spd-ukraine/ --email andriyorehov@gmail.com --password ********
```

```bash
➜ lincps --url https://www.linkedin.com/company/spd-ukraine/
===================================
Found 351 employees
Matched 255 employees
Java: 87
QA: 56
Front-edn: 55
Team lead: 18
PM: 14
Python: 5
IOS: 4
Designer: 4
Android: 3
Node: 2
DevOps: 2
System administrator: 2
React: 1
Angular: 1
Mobile: 1
```

[version-badge]: https://img.shields.io/npm/v/lincps.svg?style=flat-square
[package]: https://www.npmjs.com/package/lincps
