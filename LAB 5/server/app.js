const { ApolloServer } = require("apollo-server");
const axios = require("axios");
const uuid = require("uuid");
const Redis = require("redis");
const client = Redis.createClient();
client.connect().then(() => {});
//Chakravarti Kothadiya
const typeDefs = `
    type Query {
        locationPosts(pageNum: Int): [Location]
        likedLocations: [Location]
        userPostedLocations: [Location]
    }

    type Location {
        id: ID!
        image: String!
        name: String!
        address: String
        userPosted: Boolean!
        liked: Boolean!
    }

    type Mutation {
        uploadLocation(image: String!, address: String, name: String):Location
        updateLocation(id: ID!, image: String, name: String, address: String, userPosted: Boolean, liked: Boolean):Location
        deleteLocation(id: ID!):Location
    }
`;

const resolvers = {
  Mutation: {
    deleteLocation: async (parent, args, context) => {
      const { id } = args;
      let arr = await client.lRange("Locations_List", 0, -1);
      let temp = [];
      arr.map((elem) => {
        temp.push(JSON.parse(elem));
      });

      let filtered_location = temp.filter((elem) => elem.id === id);
      await client.lRem(
        "Locations_List",
        1,
        JSON.stringify(filtered_location[0])
      );
      return filtered_location[0];
    },
    uploadLocation: async (parent, args, context) => {
      const { image, address, name } = args;
      let obj = {
        id: uuid.v4(),
        image: image,
        name: name,
        address: address,
        userPosted: true,
        liked: false,
      };

      //Store this obj in Redis
      await client.lPush("Locations_List", JSON.stringify(obj));

      return obj;
    },
    updateLocation: async (parent, args, locations) => {
      const { id, name, image, address, userPosted, liked } = args;

      //   let updatedLocation_obj = {
      //     id: id,
      //     name: name,
      //     image: image,
      //     address: address,
      //     userPosted: userPosted,
      //     liked: liked,
      //   };

      if (liked === true && userPosted === false) {
        await client.lPush("Locations_List", JSON.stringify({ ...args }));
      } else if (
        (liked === true && userPosted === true) ||
        (liked === false && userPosted === true)
      ) {
        let arr = await client.lRange("Locations_List", 0, -1);
        let temp = [];
        arr.map((elem) => {
          temp.push(JSON.parse(elem));
        });

        let index = null;
        let filtered_location = temp.filter((elem, i) => {
          if (elem.id === id) {
            index = i;
            return elem;
          }
        });
        // client.lRem("Locations_List", 1, JSON.stringify(filtered_location[0]));
        // await client.lPush(
        //   "Locations_List",
        //   JSON.stringify(updatedLocation_obj)
        // );
        const update = await client.lSet(
          "Locations_List",
          index,
          JSON.stringify({ ...args })
        );
      } else if (liked === false && userPosted === false) {
        let arr = await client.lRange("Locations_List", 0, -1);
        let temp = [];
        arr.map((elem) => {
          temp.push(JSON.parse(elem));
        });

        let filtered_location = temp.filter((elem) => elem.id === id);
        await client.lRem(
          "Locations_List",
          1,
          JSON.stringify(filtered_location[0])
        );
      }

      return { ...args };
    },
  },
  Query: {
    locationPosts: async (parent, args, context) => {
      const pageNum = args.pageNum;
      let limit = pageNum * 10;
      const options = {
        method: "GET",
        url: `https://api.foursquare.com/v3/places/search?limit=${limit}`,
        headers: {
          accept: "application/json",
          Authorization: "fsq30G56dF1RJt46AQ0NldhUsu2HieqO5r6yrVFbLman/88=",
        },
      };

      let data = await axios
        .request(options)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          console.error(error);
        });

      //console.log(data.results.length);

      const temp = async (item) => {
        const options2 = {
          method: "GET",
          url: `https://api.foursquare.com/v3/places/${item.fsq_id}/photos`,
          headers: {
            accept: "application/json",
            Authorization: "fsq30G56dF1RJt46AQ0NldhUsu2HieqO5r6yrVFbLman/88=",
          },
        };

        let photo_data = await axios
          .request(options2)
          .then(function (response) {
            return response.data[0] ? response.data[0] : null;
          })
          .catch(function (error) {
            console.error(error);
          });

        return photo_data;
      };

      //Call the redis query here
      let arr1 = await client.lRange("Locations_List", 0, -1);
      let redis_obj_arr = [];
      arr1.map((elem) => {
        redis_obj_arr.push(JSON.parse(elem));
      });

      let location_arr = data.results.map(async (item) => {
        let p_data = await temp(item);
        let location_obj = {};
        location_obj.id = item.fsq_id;
        location_obj.name = item.name;
        location_obj.address = item.location.address;
        location_obj.userPosted = false;
        const matchingObj = redis_obj_arr.find(
          (redis_obj) => redis_obj.id === item.fsq_id
        );

        if (matchingObj) {
          location_obj.liked = matchingObj.liked;
        } else {
          location_obj.liked = false;
        }

        location_obj.image = p_data
          ? String(p_data.prefix + "original" + p_data.suffix)
          : "https://upload.wikimedia.org/wikipedia/commons/6/62/%22No_Image%22_placeholder.png?20160409161805";
        return location_obj;
      });

      //resolve the Promises as our map function is an Async function
      location_arr = await Promise.all(location_arr);
      return location_arr;
    },
    likedLocations: async (parent, args, context) => {
      let arr = await client.lRange("Locations_List", 0, -1);
      let obj_arr = [];
      arr.map((elem) => {
        obj_arr.push(JSON.parse(elem));
      });
      let new_obj_arr = obj_arr.filter((elem) => elem.liked === true);

      return new_obj_arr;
    },
    userPostedLocations: async (parent, args, context) => {
      let arr = await client.lRange("Locations_List", 0, -1);
      let obj_arr = [];
      arr.map((elem) => {
        obj_arr.push(JSON.parse(elem));
      });
      let filtered_location = obj_arr.filter(
        (elem) => elem.userPosted === true
      );

      return filtered_location;
    },
  },
};

const Server = new ApolloServer({ typeDefs, resolvers });

Server.listen(4000).then(({ url }) => {
  console.log("Server is running on" + url);
});
