const format = require('date-fns/format');
const { getCardCode } = require('./utils/cardUtils');

module.exports.mapNdcRequestData_AF = (config, { offerId, offerItems, passengers }) => ({
  ...(JSON.parse(JSON.stringify(config))),
  trackingMessageHeader: {
    consumerRef : {
      consumerTime: (new Date(Date.now())).toISOString(),
    },
  },
  Query: {
    Order: {
      Offer: {
        OfferId: offerId,
        Owner: config.AirlineID,
        OfferItems: offerItems,
      },
    },
    DataList: {
      passengers,
    },
  },
});

module.exports.mapNdcRequestHeaderData_AC = guaranteeClaim => ({
  Function: 'OrderCreateRQ',
  SchemaType: 'NDC',
  SchemaVersion: 'YY.2017.2',
  ...(!guaranteeClaim ? {
    RichMedia: true
  } : {}),
  Sender: {
    Address: {
      Company: 'WindingTree',
      NDCSystemId: guaranteeClaim ? 'DEV-PCI' : 'DEV'
    }
  },
  Recipient: {
    Address: {
      Company: 'AC',
      NDCSystemId: guaranteeClaim ? 'DEV-PCI' : 'DEV'
    }
  }
});

module.exports.mapNdcRequestData_AC = (
  { apiKey, commission, AirlineID, Document, ...config },// extract the only needed part of config
  offer,
  body,
  guaranteeClaim,
  documentId = 'OneWay'
) => ({
  ...(JSON.parse(JSON.stringify(config))),
  ...({
    Document: {
      '@id': documentId,
      Name: Document.Name,
      ReferenceVersion: Document.ReferenceVersion
    }
  }),
  Query: {
    Order: {
      ...(
        !Array.isArray(offer.extraData.seats)
          ? {
            Offer: {
              '@Owner': config.AirlineID,
              '@OfferID': offer.extraData && offer.extraData.offerId
                ? offer.extraData.offerId
                : body.offerId,
              '@ResponseID': '',
              TotalOfferPrice: {
                '@Code': offer.currency,
                '@value': offer.amountAfterTax
              },
              OfferItem: Object.entries(offer.offerItems).map(o => ({
                '@OfferItemID': o[0],
                PassengerRefs: o[1].passengerReferences
                  .split(' ')
                  .map(p => offer.extraData.mappedPassengers[p])
                  .join(' ')
              }))
            }
          }
        : {}
      ),
      ...(
        Array.isArray(offer.extraData.seats)
         ? {
          OrderItem: offer.extraData.seats
            .map(
              s => ({
                '@refs': ` ${offer.extraData.mappedPassengers[s.passenger]} ${s.segment}`,
                OfferItemID: {
                  '@Owner': 'AC',
                  '@value': Object.entries(offer.offerItems)
                    .reduce(
                      (a, v) => {
                        const passengers = v[1].passengerReferences.split(' ');
                        if (passengers.includes(s.passenger)) {
                          a = v[0];
                        }
                        return a;
                      },
                      ''
                    )
                },
                OfferItemType: {
                  SeatItem: {
                    Location: {
                      Row: {
                        Number: s.seatNumber
                      }
                    }
                  }
                }
              })
            )
         }
         : {}
      )
    },
    ...(body.guaranteeId ? {
      Payments: {
        Payment: {
          Type: 'CC',
          Method: {
            PaymentCard: {
              CardType: 3,
              CardCode: getCardCode(guaranteeClaim.card),
              CardNumber: guaranteeClaim.card.accountNumber,
              ...(guaranteeClaim.card.cvv ? {
                SeriesCode: guaranteeClaim.card.cvv
              } : {}),
              CardHolderName: 'Simard OU',
              CardHolderBillingAddress: {
                Street: 'Tartu mnt 67',
                BuildingRoom: '1-13b',
                CityName: 'Tallinn',
                StateProv: 'Harju',
                PostalCode: '10115',
                CountryCode: 'EE'
              },
              EffectiveExpireDate: {
                Expiration: `${guaranteeClaim.card.expiryMonth}${guaranteeClaim.card.expiryYear.substr(-2)}`
              }
            }
          },
          Amount: {
            '@Code': offer.currency,
            '@value': offer.amountAfterTax
          }
        }
      }
    } : {}),
    DataLists: {
      PassengerList: {
        Passenger: Object.entries(body.passengers).map(p => ({
          '@PassengerID': offer.extraData.mappedPassengers[p[0]],
          PTC: p[1].type,
          Birthdate: format(new Date(p[1].birthdate), 'yyyy-MM-dd'),
          Individual: {
            Gender: p[1].gender,
            NameTitle: p[1].civility,
            GivenName: p[1].firstnames.join(' '),
            Surname: p[1].lastnames.join(' ')
          },
          ContactInfoRef: 'CTC1'
        }))
      },
      ContactList: {
        ContactInformation: Object.entries(body.passengers).map((p, i) => ({
          '@ContactID': `CTC${i + 1}`,
          ContactType: '1.PTT',
          ContactProvided: p[1].contactInformation.map(c => {
            if (c.indexOf('@') !== -1) {
              return {
                EmailAddress: {
                  EmailAddressValue: c
                }
              };
            } else if (c.indexOf('+') !== -1) {
              const phone = c.match(/^\+(\d{1})(\d{3})(\d+)$/);
              return {
                Phone: {
                  Label: '8.PLT',
                  CountryDialingCode: phone[1],
                  AreaCode: phone[2],
                  PhoneNumber: phone[3]
                }
              };
            } else {
              return null;
            }
          }).filter(c => c !== null)
        }))
      },
      FlightSegmentList: {
        FlightSegment: offer.extraData.segments.map(s => ({
          '@SegmentKey': s.id,
          '@ElectronicTicketInd': true,
          '@refs': offer.extraData.destinations
            .reduce(
              (a, v) => {
                const refs = v.FlightReferences.split(' ');
                if (refs.includes(s.id)) {
                  a.push(v.id);
                }
                return a;
              },
              []
            )
            .join(' '),
          Departure: s.Departure,
          Arrival: s.Arrival,
          MarketingCarrier: s.MarketingCarrier,
          OperatingCarrier: s.OperatingCarrier,
          Equipment: s.Equipment,
          ClassOfService: s.ClassOfService,
          FlightDetail: {
            ...(
              s.FlightDetail && 
              s.FlightDetail.FlightDuration &&
              s.FlightDetail.FlightDuration.Value !== ''
                ? {
                  FlightDuration: s.FlightDetail.FlightDuration
                }
                : {}
            ),
            Stops: s.FlightDetail.Stops
          }
        }))
      },
      OriginDestinationList: {
        OriginDestination: offer.extraData.destinations.map(d => ({
          '@OriginDestinationKey': d.id,
          DepartureCode: d.DepartureCode,
          ArrivalCode: d.ArrivalCode,
          FlightReferences: d.FlightReferences
        }))
      },
      ...(!body.guaranteeId ? {
        InstructionsList: {
          Instruction: {
            '@ListKey': 'eTicket',
            FreeFormTextInstruction: {
              Remark: '1.TST'
            }
          }
        }
      } : {})
    }
  }
});
