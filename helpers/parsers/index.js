const parse = require('date-fns/parse');
const { zonedTimeToUtc } = require('date-fns-tz');
const { airports } = require('./timeZoneByAirportCode');

const reduceObjectToProperty = (object, property) => Object.entries(object)
  .reduce((result, [key, value])=> ({
      ...result,
      [key]: value[property]
    }), {});

const splitPropertyBySpace = (array, property) => array
  .map((element) => ({
    ...element,
    [property]: element[property].split(' ')
  }));

const reduceContactInformation = (passengers) => passengers
  .map((passenger) => {
    const emails = passenger.contactInformation.emails.map(({value})=> value);
    const phones = passenger.contactInformation.phones.map(({value})=> value);
    return {
      ...passenger,
      contactInformation: emails.concat(phones),
    }});

const useDictionary = (array, object, keyToReplace) => array
  .map((element) =>({
    ...element,
    [keyToReplace]: object[element[keyToReplace]],
  }));

const mergeHourAndDate = (array, dateName, timeName, finalName) => array
  .map(({ [dateName]: date, [timeName]: time, destination, ...others}) => {
    const utcDate = zonedTimeToUtc(`${date} ${time}:00.000`, airports[destination.iataCode]);
    return {
    ...others,
    destination,
    [finalName]: utcDate,
  }});

const reduceToProperty = (object, property) =>  Object.keys(object)
  .map((key)=> {
    return {
      [key]: object[key][property]
    }
  });

const splitSegments = (combinations) => combinations.map(({_items_, ...others})=> ({
  ...others,
  _items_ : _items_.split(' '),
}));

const reduceToObjectByKey = (array) => array
  .reduce((segments, { _id_, ...others }) => ({
    ...segments,
    [_id_]: others,
  }), {});

const roundCommissionDecimals = (offers) => offers
  .map(({price, ...others}) => ({
    ...others,
    price: {
      ...price,
      commission: price.commission.toFixed(2).toString()
    }
  }));

module.exports = {
  reduceToObjectByKey,
  roundCommissionDecimals,
  splitSegments,
  reduceToProperty,
  mergeHourAndDate,
  useDictionary,
  reduceContactInformation,
  splitPropertyBySpace,
  reduceObjectToProperty,
};