import * as core from "@gatling.io/core";
import { http } from "@gatling.io/http";
import * as utils from "./config/utils";
import { withAuthenticationHeader } from "./endpoints/apiEndpoints";
import * as groups from "./groups/scenarioGroups";

export default core.simulation((setUp) => {
  const httpProtocol = withAuthenticationHeader(
    http
      .baseUrl(utils.baseUrl)
      .acceptHeader("application/json")
      .userAgentHeader(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0"
      )
  );

  const scn1 = core
    .scenario("Scenario A1")
    .exitBlockOnFail()
    .on(
      core
        .randomSwitch()
        .on(
          core
            .percent(utils.frPerc)
            .then(
              core
                .group("fr")
                .on(
                  groups.homeAnonymous,
                  core.pause(utils.minPauseSec, utils.maxPauseSec),
                  groups.authenticate,
                  groups.homeAuthenticated,
                  core.pause(utils.minPauseSec, utils.maxPauseSec),
                  groups.addToCart,
                  core.pause(utils.minPauseSec, utils.maxPauseSec),
                  groups.buy
                )
            ),
          core
            .percent(utils.usPerc)
            .then(
              core
                .group("us")
                .on(
                  groups.homeAnonymous,
                  core.pause(utils.minPauseSec, utils.maxPauseSec),
                  groups.authenticate,
                  groups.homeAuthenticated,
                  core.pause(utils.minPauseSec, utils.maxPauseSec),
                  groups.addToCart,
                  core.pause(utils.minPauseSec, utils.maxPauseSec),
                  groups.buy
                )
            )
        )
    )
    .exitHereIfFailed();

  const scn2 = core
    .scenario("Scenario A2")
    .exitBlockOnFail()
    .on(
      core
        .uniformRandomSwitch()
        .on(
          core
            .group("fr")
            .on(
              groups.homeAnonymous,
              core.pause(utils.minPauseSec, utils.maxPauseSec),
              groups.authenticate,
              groups.homeAuthenticated,
              core.pause(utils.minPauseSec, utils.maxPauseSec),
              groups.addToCart,
              core.pause(utils.minPauseSec, utils.maxPauseSec),
              groups.buy
            ),
          core
            .group("us")
            .on(
              groups.homeAnonymous,
              core.pause(utils.minPauseSec, utils.maxPauseSec),
              groups.authenticate,
              groups.homeAuthenticated,
              core.pause(utils.minPauseSec, utils.maxPauseSec),
              groups.addToCart,
              core.pause(utils.minPauseSec, utils.maxPauseSec),
              groups.buy
            )
        )
    )
    .exitHereIfFailed();

  const injectionProfile = (scn, type) => {
    switch (type) {
      case "capacity":
        return scn.injectOpen(
          core
            .incrementUsersPerSec(utils.users)
            .times(4)
            .eachLevelLasting({amount: utils.duration, unit: "minutes"})
            .separatedByRampsLasting(4)
            .startingFrom(10)
        );
      case "soak":
        return scn.injectOpen(core.constantUsersPerSec(utils.users).during({amount: utils.duration, unit: "minutes"}));
      case "stress":
        return scn.injectOpen(core.stressPeakUsers(utils.users).during({amount: utils.duration, unit: "minutes"}));
      case "breakpoint":
        return scn.injectOpen(core.rampUsersPerSec(0).to(utils.users).during({amount: utils.duration, unit: "minutes"}));
      case "ramp-hold":
        return scn.injectOpen(
          core.rampUsersPerSec(0).to(utils.users).during({amount: utils.ramp_duration, unit: "minutes"}),
          core.constantUsersPerSec(utils.users).during({amount: utils.duration, unit: "minutes"})
        );
      case "smoke":
        return scn.injectOpen(core.atOnceUsers(1));
      default:
        return scn.injectOpen(core.atOnceUsers(utils.users));
    }
  };

  const assertions = [
    core.global().responseTime().percentile(90.0).lt(500),
    core.global().failedRequests().percent().lt(5.0)
  ];

  const getAssertion = (type) => {
    switch (type) {
      case "capacity":
      case "soak":
      case "stress":
      case "breakpoint":
      case "ramp-hold":
        return assertions;
      case "smoke":
        return [core.global().failedRequests().count().lt(1.0)];
      default:
        return assertions;
    }
  };

  setUp(injectionProfile(scn1, utils.testType), injectionProfile(scn2, utils.testType))
    .assertions(...getAssertion(utils.testType))
    .protocols(httpProtocol);
});
