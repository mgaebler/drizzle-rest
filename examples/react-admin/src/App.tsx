import { Admin, EditGuesser, ListGuesser, Resource, ShowGuesser } from "react-admin";
import { Layout } from "./Layout";
import jsonServerProvider from "ra-data-json-server";

const dataProvider = jsonServerProvider("http://0.0.0.0:3000/api/v1");

export const App = () => (
    <Admin layout={Layout} dataProvider={dataProvider} title="My Admin App">
        {/* Add your resources here */}
        <Resource name="users" list={ListGuesser} show={ShowGuesser} edit={EditGuesser} />
        <Resource name="posts" list={ListGuesser} show={ShowGuesser} edit={EditGuesser} />
        <Resource name="comments" list={ListGuesser} show={ShowGuesser} edit={EditGuesser} />
        <Resource name="categories" list={ListGuesser} show={ShowGuesser} edit={EditGuesser} />
        <Resource name="tags" list={ListGuesser} show={ShowGuesser} edit={EditGuesser} />

        <Resource name="post_categories" list={ListGuesser} show={ShowGuesser} edit={EditGuesser} />
        <Resource name="post_tags" list={ListGuesser} show={ShowGuesser} edit={EditGuesser} />
    </Admin>
);
