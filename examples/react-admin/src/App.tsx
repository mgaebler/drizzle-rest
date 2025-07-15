import { Admin, ListGuesser, Resource } from "react-admin";
import { Layout } from "./Layout";
import jsonServerProvider from "ra-data-json-server";

const dataProvider = jsonServerProvider("http://0.0.0.0:3000/api/v1");

export const App = () => (
    <Admin layout={Layout} dataProvider={dataProvider} title="My Admin App">
        {/* Add your resources here */}
        <Resource name="users" list={ListGuesser} />
        <Resource name="posts" list={ListGuesser} />
        <Resource name="comments" list={ListGuesser} />
        <Resource name="categories" list={ListGuesser} />
        <Resource name="tags" list={ListGuesser} />

        <Resource name="post_categories" list={ListGuesser} />
        <Resource name="post_tags" list={ListGuesser} />
    </Admin>
);
