#!/usr/bin/env bash

set -o errexit

npx now -e AF_API_KEY=$AF_API_KEY -e AF_COMISSION=$AF_COMISSION -e AF_SENDER_NAME=$AF_SENDER_NAME -e AF_SENDER_PSEUDOCITY=$AF_SENDER_PSEUDOCITY -e AF_SENDER_IATA_NUMBER=$AF_SENDER_IATA_NUMBER -e AF_SENDER_AGENCY_ID=$AF_SENDER_AGENCY_ID -e AF_SENDER_AGENT_USER_ID=$AF_SENDER_AGENT_USER_ID -e AF_PARTICIPANT_ENABLED_SYSTEM_PARTICIPANT_SEQUENCE_NUMBER=$AF_PARTICIPANT_ENABLED_SYSTEM_PARTICIPANT_SEQUENCE_NUMBER -e AF_PARTICIPANT_ENABLED_SYSTEM_PARTICIPANT_NAME=$AF_PARTICIPANT_ENABLED_SYSTEM_PARTICIPANT_NAME -e AF_PARTICIPANT_ENABLED_SYSTEM_PARTICIPANT_SYSTEM_ID=$AF_PARTICIPANT_ENABLED_SYSTEM_PARTICIPANT_SYSTEM_ID -e AF_PARTICIPANT_RECIPENT_AIRLINE_ID=$AF_PARTICIPANT_RECIPENT_AIRLINE_ID -e AF_PARTICIPANT_RECIPENT_NAME=$AF_PARTICIPANT_RECIPENT_NAME -e REDIS_URL=$REDIS_URL -e MONGO_URL=$MONGO_URL -e ELASTIC_URL=$ELASTIC_URL -e EREVMAX_RESERVATION_URL=$EREVMAX_RESERVATION_URL -e EREVMAX_AVAILABILITY_URL=$EREVMAX_AVAILABILITY_URL -e INFURA_ENDPOINT=$INFURA_ENDPOINT -e INFURA_PROJECT_ID=$INFURA_PROJECT_ID -e GLIDER_ORGID=$GLIDER_ORGID -e GLIDER_ADMIN_KEY=$GLIDER_ADMIN_KEY -e LIF_MIN_DEPOSIT=$LIF_MIN_DEPOSIT -e SIMARD_URL=$SIMARD_URL --token=$NOW_TOKEN dev &