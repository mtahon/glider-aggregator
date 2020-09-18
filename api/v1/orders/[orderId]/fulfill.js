const { transformAmadeusFault } = require('../../../../helpers/providers/flights/amadeus/errors');

const { fulfillOrderTemplate_1A } = require('../../../../helpers/amadeus/fulfillOrderRequestTemplate');
const { fulfillOrderResponseProcessor } = require('../../../../helpers/providers/flights/amadeus/resolvers/fulfillOrderResponseProcessor');
const { ready, transform } = require('camaro');
const { basicDecorator } = require('../../../../decorators/basic');
const GliderError = require('../../../../helpers/error');
const {
  airFranceConfig,
  airCanadaConfig,
} = require('../../../../config');
const { ordersManager } = require('../../../..//helpers/models/order');
const {
  mapNdcRequestData_AF,
  mapNdcRequestHeaderData_AC,
  mapNdcRequestData_AC,
} = require('../../../../helpers/transformInputData/fulfillOrder');
const {
  fulfillOrderTemplate_AF,
  fulfillOrderTemplate_AC,
} = require('../../../../helpers/soapTemplates/fulfillOrder');
const {
  ErrorsTransformTemplate_AF,
  ErrorsTransformTemplate_AC,
  FaultsTransformTemplate_AC,
  fulfillOrderTransformTemplate_AF,
  fulfillOrderTransformTemplate_AC,
} = require('../../../../helpers/camaroTemplates/fulfillOrder');
const {
  reduceToObjectByKey,
  reduceToProperty,
} = require('../../../../helpers/parsers');
const {
  getGuarantee,
  claimGuarantee,
  claimGuaranteeWithCard,
} = require('../../../../helpers/guarantee');
const {
  callProvider, callProviderRest,
} = require('../../../../helpers/resolvers/utils/flightUtils');


module.exports = basicDecorator(async (req, res) => {
  const { body, query } = req;
  let guaranteeClaim;

  // Get the order
  const order = await ordersManager.getOrder(query.orderId);


  if (order.offer && order.offer.extraData && order.offer.extraData.mappedPassengers) {
    body.passengerReferences = body.passengerReferences
      .map(p => order.offer.extraData.mappedPassengers[p]);
  } else {
    throw new GliderError(
      'Mapped passengers Ids not found in the offer',
      500,
    );
  }

  // Get the guarantee and verify
  const guarantee = await getGuarantee(body.guaranteeId, {
    currency: order.order.order.price.currency,
    amountAfterTax: order.order.order.price.public,
  });

  let ndcRequestHeaderData;
  let ndcRequestData;
  let providerUrl;
  let apiKey;
  let SOAPAction;
  let ndcBody;
  let responseTransformTemplate;
  let errorsTransformTemplate;
  let faultsTransformTemplate;
  let provider = order.provider;
  switch (provider) {
    case 'AF':
      ndcRequestData = mapNdcRequestData_AF(airFranceConfig, body, query);
      providerUrl = 'https://ndc-rct.airfranceklm.com/passenger/distribmgmt/001489v01/EXT';
      apiKey = airFranceConfig.apiKey;
      SOAPAction = '"http://www.af-klm.com/services/passenger/AirDocIssue/airDocIssue"';
      ndcBody = fulfillOrderTemplate_AF(ndcRequestData);
      responseTransformTemplate = fulfillOrderTransformTemplate_AF;
      errorsTransformTemplate = ErrorsTransformTemplate_AF;
      faultsTransformTemplate = null;
      break;
    case 'AC':
      guaranteeClaim = await claimGuaranteeWithCard(body.guaranteeId);
      ndcRequestHeaderData = mapNdcRequestHeaderData_AC(guaranteeClaim);
      ndcRequestData = mapNdcRequestData_AC(airCanadaConfig, order, body, guaranteeClaim);
      providerUrl = `${airCanadaConfig.baseUrlPci}/OrderCreate`;
      apiKey = airCanadaConfig.apiKey;
      ndcBody = fulfillOrderTemplate_AC(ndcRequestHeaderData, ndcRequestData);
      // console.log('@@@', ndcBody);
      responseTransformTemplate = fulfillOrderTransformTemplate_AC;
      errorsTransformTemplate = ErrorsTransformTemplate_AC;
      faultsTransformTemplate = FaultsTransformTemplate_AC;
      break;

    case '1A':
      guaranteeClaim = await claimGuaranteeWithCard(body.guaranteeId);
      // ndcRequestHeaderData = mapNdcRequestHeaderData_AC(guaranteeClaim);
      // ndcRequestData = mapNdcRequestData_AC(airCanadaConfig, order, body, guaranteeClaim);
      // providerUrl = `${airCanadaConfig.baseUrlPci}/OrderCreate`;
      // apiKey = airCanadaConfig.apiKey;
      ndcBody = fulfillOrderTemplate_1A(order, body, guaranteeClaim);
      // console.log('@@@', ndcBody);
      // responseTransformTemplate = fulfillOrderTransformTemplate_AC;
      // errorsTransformTemplate = ErrorsTransformTemplate_AC;
      // faultsTransformTemplate = FaultsTransformTemplate_AC;
      break;
    default:
      return Promise.reject('Unsupported flight operator');
  }
  console.log('provider=', provider);
  const { response, error } = (provider === '1A') ? await callProviderRest(provider, '', '', ndcBody, 'ORDERCREATE') : await callProvider(provider, providerUrl, apiKey, ndcBody, SOAPAction);

  if (error && !error.isAxiosError) {
    throw new GliderError(response.error.message, 502);
  }

  let faultsResult;
  if (faultsTransformTemplate) {
    await ready();
    faultsResult = await transform(response.data, faultsTransformTemplate);
  }

  // Attempt to parse as a an error
  await ready();
  const errorsResult = provider === '1A' ? transformAmadeusFault(response.result) : await transform(response.data, errorsTransformTemplate);

  // Because of two types of errors can be returned: NDCMSG_Fault and Errors
  const combinedErrors = [
    ...(faultsResult ? faultsResult.errors : []),
    ...errorsResult.errors,
  ];

  // If an error is found, stop here
  if (combinedErrors.length) {
    throw new GliderError(
      combinedErrors.map(e => e.message).join('; '),
      502,
    );
  } else if (error) {
    throw new GliderError(
      error.message,
      502,
    );
  }

  await ready();
  const fulfillResults = provider === '1A' ? fulfillOrderResponseProcessor(response.result) : await transform(response.data, responseTransformTemplate);

  fulfillResults.travelDocuments.etickets = reduceToObjectByKey(fulfillResults.travelDocuments.etickets);
  fulfillResults.travelDocuments.etickets = reduceToProperty(fulfillResults.travelDocuments.etickets, '_passenger_');

  if (!guaranteeClaim) {
    guaranteeClaim = await claimGuarantee(body.guaranteeId);
  }

  await ordersManager.saveOrder(
    body.orderId,
    {
      request: body,
      guarantee: guarantee,
      guaranteeClaim: guaranteeClaim,
      order: fulfillResults,
      offer: order.offer,
    },
  );

  res.status(200).json(fulfillResults);
});
