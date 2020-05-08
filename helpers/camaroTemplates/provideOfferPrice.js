const  { airCanadaConfig } = require('../../config');

module.exports.provideOfferPriceTransformTemplate_AC = {
  offerId: '//OfferPriceRS/PricedOffer/@OfferID',
  offer: {
    expiration: '//OfferPriceRS/PricedOffer/TimeLimits/OfferExpiration/@DateTime',
    price: {
      currency: '//OfferPriceRS/PricedOffer/TotalPrice/DetailCurrencyPrice/Total/@Code',
      public: '//OfferPriceRS/PricedOffer/TotalPrice/DetailCurrencyPrice/Total',
      // commission: [
      //   '//OfferPriceRS/PricedOffer/OfferItem',
      //   {
      //     value: `number(TotalPriceDetail/BaseAmount) * ${airCanadaConfig.commission}`
      //   }
      // ],
      taxes: [
        '//OfferPriceRS/PricedOffer/OfferItem',
        {
          value: 'TotalPriceDetail/Taxes/Total'
        }
      ]
    },
    pricedItems: [
      '//OfferPriceRS/PricedOffer/OfferItem',
      {
        _id_: '@OfferItemID',
        taxes: [
          'TotalPriceDetail/Taxes/Breakdown/Tax',
          {
            amount: 'Amount',
            code: 'TaxCode',
            description: 'Description'
          }
        ],
        fareBase: { // Will be concatenated into `fare` array
          usage: '#base',
          amount: 'FareDetail/Price/BaseAmount',
          components: [
            'FareDetail/FareComponent',
            {
              name: 'FareBasis/CabinType/CabinTypeName',
              basisCode: 'FareBasis/FareBasisCode/Code',
              designator: 'FareBasis/RBD',
              conditions: 'PriceClassRef'// Will be mapped to price class
            }
          ]
        },
        fareSurcharge: [ // Will be concatenated into `fare` array
          'TotalPriceDetail/Surcharges/Surcharge',
          {
            usage: '#surcharge',
            code: 'Breakdown/Fee/Designator',
            description: 'Breakdown/Fee/Description',
            amount: 'Breakdown/Fee/Amount'
          }
        ]
      }
    ],
    priceClassList: [
      '//OfferPriceRS/DataLists/PriceClassList/PriceClass',
      {
        _id_: '@PriceClassID',
        name: 'Name',
        code: 'Code',
        description: [
          'Descriptions/Description',
          'Text'
        ]
      }
    ],
    terms: [
      '//OfferPriceRS/DataLists/TermsList/Term/Descriptions/Description',
      'Text'
    ],
    passengers: [
      '//OfferPriceRS/DataLists/PassengerList/Passenger',
      {
        _id_: '@PassengerID',
        type: 'PTC',
        // gender: 'Individual/Gender',
        // civility: 'Individual/NameTitle',
        // lastnames: 'Individual/Surname',
        // firstnames: 'Individual/GivenName',
        // birthdate: 'Individual/Birthdate',
        // contactInformation: 'ContactInfoRef'
      }
    ],
    itinerary:  {
      segments: [
        '//OfferPriceRS/DataLists/FlightSegmentList/FlightSegment',
        {
          _id_: '@SegmentKey',
          operator: {
            operatorType: '#airline',
            iataCode: 'OperatingCarrier/AirlineID'
          },
          origin: {
            locationType: '#airport',
            iataCode: 'Departure/AirportCode'
          },
          destination: {
            locationType: '#airport',
            iataCode: 'Arrival/AirportCode'
          },
          splittedDepartureTime: 'Departure/Time',
          splittedDepartureDate: 'Departure/Date',
          splittedArrivalTime: 'Arrival/Time',
          splittedArrivalDate: 'Arrival/Date'
        }
      ]
    },
    services: [
      '//OfferPriceRS/DataLists/ServiceDefinitionList/ServiceDefinition',
      {
        _id_: '@ServiceDefinitionID',
        code: 'Encoding/Code',
        name: 'Name',
        description: [
          'Descriptions/Description',
          'Text'
        ],
        segments: [
          'ServiceBundle',
          'ServiceDefinitionRef'
        ]
      }
    ]
  }
};

module.exports.FaultsTransformTemplate_AC = {
  errors: ['//NDCMSG_Fault', {
    message: 'Description',
    code: 'ErrorCode',
    date: 'Timestamp'
  }]
};

module.exports.ErrorsTransformTemplate_AC = {
  errors: ['//Errors', {
    message: 'Error',
    code: 'Error/@Code',
    type: 'Error/@Type'
  }]
};
