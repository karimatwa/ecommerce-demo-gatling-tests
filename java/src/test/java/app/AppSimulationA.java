package app;

import static app.config.Utils.*;
import static app.endpoints.APIendpoints.*;
import static app.groups.ScenarioGroups.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

public class AppSimulationA extends Simulation {

  private static final HttpProtocolBuilder httpProtocolWithAuthentication =
      withAuthenticationHeader(
          http.baseUrl(baseUrl)
              .acceptHeader("application/json")
              .userAgentHeader(
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0"));

  private static final FeederBuilder<String> frFeeder =
      csv("performance-data/" + type + "-data/" + type + "_index_" + frDelay + ".csv").queue();
  private static final FeederBuilder<String> usFeeder =
      csv("performance-data/" + type + "-data/" + type + "_index_" + usDelay + ".csv").queue();

  private static final ScenarioBuilder scenario1 =
      scenario("Scenario A1")
          .exitBlockOnFail()
          .on(
              randomSwitch()
                  .on(
                      percent(frWeight)
                          .then(
                              group("fr")
                                  .on(
                                      feed(frFeeder),
                                      homeAnonymous,
                                      authenticate,
                                      homeAuthenticated,
                                      addToCart,
                                      buy)),
                      percent(usWeight)
                          .then(
                              group("us")
                                  .on(
                                      feed(usFeeder),
                                      homeAnonymous,
                                      authenticate,
                                      homeAuthenticated,
                                      addToCart,
                                      buy))))
          .exitHereIfFailed();

  private static final ScenarioBuilder scenario2 =
      scenario("Scenario A2")
          .exitBlockOnFail()
          .on(
              uniformRandomSwitch()
                  .on(
                      group("fr")
                          .on(
                              feed(frFeeder),
                              homeAnonymous,
                              authenticate,
                              homeAuthenticated,
                              addToCart,
                              buy),
                      group("us")
                          .on(
                              feed(usFeeder),
                              homeAnonymous,
                              authenticate,
                              homeAuthenticated,
                              addToCart,
                              buy)))
          .exitHereIfFailed();

  private static final PopulationBuilder getTypeOfLoadTestSc1(String type) {
    return switch (type) {
      case "capacity" ->
          scenario1.injectOpen(
              incrementUsersPerSec(users)
                  .times(4)
                  .eachLevelLasting(duration)
                  .separatedByRampsLasting(4)
                  .startingFrom(10));
      case "soak" -> scenario1.injectOpen(constantUsersPerSec(users).during(duration));
      case "stress" -> scenario1.injectOpen(stressPeakUsers(users).during(duration));
      case "breakpoint" -> scenario1.injectOpen(rampUsersPerSec(0).to(users).during(duration));
      case "smoke" -> scenario1.injectOpen(atOnceUsers(1));
      default -> scenario1.injectOpen(atOnceUsers(users));
    };
  }

  private static final PopulationBuilder getTypeOfLoadTestSc2(String type) {
    return switch (type) {
      case "capacity" ->
          scenario2.injectOpen(
              incrementUsersPerSec(users)
                  .times(4)
                  .eachLevelLasting(duration)
                  .separatedByRampsLasting(4)
                  .startingFrom(10));
      case "soak" -> scenario2.injectOpen(constantUsersPerSec(users).during(duration));
      case "stress" -> scenario2.injectOpen(stressPeakUsers(users).during(duration));
      case "breakpoint" -> scenario2.injectOpen(rampUsersPerSec(0).to(users).during(duration));
      case "smoke" -> scenario2.injectOpen(atOnceUsers(1));
      default -> scenario2.injectOpen(atOnceUsers(users));
    };
  }

  private static final Assertion getAssertion(String type) {
    return switch (type) {
      case "capacity" -> global().responseTime().percentile(90.0).lt(500);
      case "soak" -> global().responseTime().percentile(99.9).lt(500);
      case "stress" -> global().responseTime().percentile(90.0).lt(500);
      case "breakpoint" -> global().responseTime().percentile(90.0).lt(500);
      case "smoke" -> global().failedRequests().count().lt(1L);
      default -> global().responseTime().percentile(90.0).lt(500);
    };
  }

  {
    setUp(getTypeOfLoadTestSc1(type), getTypeOfLoadTestSc2(type))
        .assertions(getAssertion(type))
        .protocols(httpProtocolWithAuthentication);
  }
}