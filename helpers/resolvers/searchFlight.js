const { transform } = require('camaro');
const axios = require('axios');
const { basicDecorator } = require('../../decorators/basic')
const { mapNdcRequestData } = require('../transformInputData/searchOffers');
const { provideAirShoppingRequestTemplate } = require('../soapTemplates/searchOffers');
const { provideAirShoppingTransformTemplate, ErrorsTransformTemplate } = require('../camaroTemplates/provideAirShopping');
const { reduceToObjectByKey,
 roundCommissionDecimals,
 splitSegments,
 reduceToProperty,
 mergeHourAndDate,
 useDictionary,
 reduceObjectToProperty,
} = require('../parsers');

const { airFranceConfig } = require('../../config');

const searchFlight = async (body) => {
  const ndcRequestData = mapNdcRequestData(body);
  const ndcBody = provideAirShoppingRequestTemplate(ndcRequestData);
  const response = await axios.post('https://ndc-rct.airfranceklm.com/passenger/distribmgmt/001448v01/EXT',
  ndcBody,
    {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'Accept-Encoding': 'gzip,deflate',
        SOAPAction: '"http://www.af-klm.com/services/passenger/ProvideAirShopping/provideAirShopping"',
        api_key: airFranceConfig.apiKey,
      },
    });
  const { errors } = await transform(response.data, ErrorsTransformTemplate);
  if (errors.length) throw new Error(`${errors[0].message}`);

  const searchResults = await transform(response.data, provideAirShoppingTransformTemplate);
  searchResults.itineraries.segments = 
    mergeHourAndDate(searchResults.itineraries.segments, 'splittedDepartureDate', 'splittedDepartureTime', 'departureTime');
  searchResults.itineraries.segments = 
    mergeHourAndDate(searchResults.itineraries.segments, 'splittedArrivalDate', 'splittedArrivalTime', 'arrivalTime');
  searchResults.itineraries.segments = reduceToObjectByKey(searchResults.itineraries.segments);
  
  // Walk through the flight list 
  var combinations = {};
  searchResults.itineraries.combinations.forEach(flight => {
    combinations[flight._id_] = flight._items_.split(' ');
  });
  searchResults.itineraries.combinations = combinations;

  // Create the offers
  for (const offer of Object.values(searchResults.offers)) {
    // Add offer items
    offer.offerItems = reduceToObjectByKey(offer.offerItems);
    offer.offerItems =  reduceObjectToProperty(offer.offerItems, '_value_');

    // Add the price plan references
    var pricePlansReferences = {};
    for(var flightsReference of offer.flightsReferences) {
      if(!pricePlansReferences[flightsReference.priceClassRef]) {
        pricePlansReferences[flightsReference.priceClassRef] = {'flights': [flightsReference.flightRef]};
      }
      else {
        pricePlansReferences[flightsReference.priceClassRef]['flights'].push(flightsReference.flightRef);
      }
    }
    offer.pricePlansReferences = pricePlansReferences;
    delete(offer.flightsReferences);
  }

  searchResults.offers = roundCommissionDecimals(searchResults.offers);
  searchResults.offers = reduceToObjectByKey(searchResults.offers);
  searchResults.passengers = reduceToObjectByKey(searchResults.passengers);
  searchResults.checkedBaggages = reduceToObjectByKey(searchResults.checkedBaggages);
  searchResults.pricePlans = useDictionary(searchResults.pricePlans, searchResults.checkedBaggages, 'checkedBaggages');
  searchResults.pricePlans = reduceToObjectByKey(searchResults.pricePlans);



  delete searchResults.checkedBaggages;
  return searchResults;
};

module.exports = {
  searchFlight,
};