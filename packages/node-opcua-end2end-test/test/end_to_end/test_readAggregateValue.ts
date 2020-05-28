import {
    OPCUAClient,
    OPCUAServer,
    NodeId,
    ClientSession,
    ReadValueIdOptions,
    StatusCodes

} from "node-opcua";
import { addAggregateSupport, AggregateFunction } from "node-opcua-aggregates";
import {
    createHistorian1,
    createHistorian2,
    createHistorian3,
    createHistorian4
} from "node-opcua-aggregates/test/helpers/create_historizing_variables";

const year = 2018;
const month = 10;
const day = 9;

export function makeDate(time: string): Date {
    const [hours, minutes, seconds] = time.split(":").map((x: string) => parseInt(x, 10));
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

let h1NodeId: NodeId;

const port = 2020;

async function startServerWithHA() {

    const server = new OPCUAServer({
        port,
    });
    await server.initialize();

    const addressSpace = server.engine.addressSpace!;

    addAggregateSupport(addressSpace);
    const h1 = createHistorian1(addressSpace);
    const h2 = createHistorian2(addressSpace);
    const h3 = createHistorian3(addressSpace);
    const h4 = createHistorian4(addressSpace);

    h1NodeId = h1.nodeId;
    return server;
}
describe("test readAggregateValue", () => {

    let server: OPCUAServer;
    let endpointUrl: string;
    before(async () => {
        server = await startServerWithHA();
        await server.start();

        endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl!;
        console.log(endpointUrl);
    });
    after(async () => {
        await server.shutdown();
    });

    it("RHA should calculate average", async () => {

        const client = OPCUAClient.create({});

        await client.withSessionAsync(endpointUrl, async (session: ClientSession) => {

            const nodes: ReadValueIdOptions = { nodeId: h1NodeId };

            const startTime = makeDate("12:00:00");
            const endTime = makeDate("12:01:40");

            const processingInterval = 16 * 1000;
            const result = await session.readAggregateValue(
                nodes,
                startTime,
                endTime,
                AggregateFunction.Maximum,
                processingInterval);

            // for the time being readAggregateValue is not implemented on server yet
            result.statusCode.should.eql(StatusCodes.BadHistoryOperationUnsupported);
            // xx console.log(result.toString());
        });
    });
});
