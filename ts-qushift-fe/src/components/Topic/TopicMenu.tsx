import { Badge, Box, Button, CircularProgress, List, ListItem, Text } from "@chakra-ui/react";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import useSWRImmutable from "swr/immutable";
import { get, post } from "../../lib/api";
import { Member, Topic } from "../../types/Conversation";
import useSWRMutation from "swr/mutation";
import { useSession } from "next-auth/react";
import { CreatableTopicElement } from "./CreatableTopicElement";
import { useEventStream } from "../../hooks/eventstream/useEventStream";

interface TopicProps {
	currTopicId?: string;
	sendSignal: boolean;
	dispatch?: Dispatch<any>;
}

export function TopicMenu({ currTopicId, sendSignal, dispatch }: TopicProps) {
	const router = useRouter();

	const { data: session } = useSession();

	const [topics, setTopics] = useState<Topic[]>();

	const [msgMap, setMsgMap] = useState<Map<string, string>>(new Map());

	// Get all topics
	const { isLoading } = useSWRImmutable(`../api/topics/page`, get, {
		onSuccess: (data) => {
			setTopics(data);
		}, revalidateOnMount: true
	});

	const { trigger } = useSWRMutation("/api/messages/send_signal", post);

	const goToTopic = useCallback((topicId: string) => {
		if (dispatch) {
			dispatch({
				type: "changed_selection",
				topicId: topicId
			});
		}

		router.push(`/messages/${topicId}`);
	}, [router]);

	// Control event source to work with SSE for incoming notify
	const topic = useEventStream<Topic>(
		`../api/stream/topics`
	);

	// Listening the incoming notify
	useEffect(() => {
		if (topic) {
			if (topics && topic.isNew) {
				if (!topics.some((t) => t.id === topic.originId)) {
					console.log(`Adding new topic ${topic.originId}`);
					setTopics([topic, ...topics]);
				}
			} else if (!topic.isNew) {
				console.log(`Updating notification for receiver on topic ${topic.originId}...`);
				const user = topic.members?.find(member => member.userId === session.user.id) as Member;

				if (!user.checkSeen) {
					if (msgMap.has(topic.originId)) {
						const countSeen = user.notSeenCount;
						if (countSeen > 99) {
							msgMap.set(topic.originId, "99+");
						} else {
							msgMap.set(topic.originId, countSeen.toString());
						}
					} else {
						msgMap.set(topic.originId, user.notSeenCount.toString());
					}
				} else {
					msgMap.set(topic.originId, "0");
				}
				setMsgMap(new Map(msgMap));
			}
		}
	}, [topic, currTopicId]);

	// Send seen signal to server
	useEffect(() => {
		if (sendSignal) {
			if (msgMap.get(currTopicId) !== "0" &&
				msgMap.get(currTopicId) !== undefined) {

				console.log(`Sending signal for ${currTopicId}...`);

				trigger({ currTopicId })
					.finally(() => {
						msgMap.set(currTopicId as string, "0");
					});
			}
		}
	}, [sendSignal])

	if (!session) {
		return;
	}

	return (
		<Box>
			<CreatableTopicElement>
				<Box />
			</CreatableTopicElement>
			<Box overflowY="auto" height="700px"
				 className="overflow-y-auto p-3 w-full">

				{isLoading && <CircularProgress isIndeterminate />}

				<List className="grid grid-cols-3 col-span-3 sm:flex sm:flex-col gap-2">
					{topics && (topics as Topic[]).map((item, index) => (
						<ListItem
							onClick={() => goToTopic(item.id)}
							key={`${item.id}-${index}`}
							style={{ textDecoration: "none" }}>

							<Button
								justifyContent={["center", "center", "center", "left"]}
								gap="3"
								size="lg"
								width="full"
								bg={currTopicId === item.id ? "blue.500" : null}
								_hover={currTopicId === item.id ? { bg: "blue.600" } : null}
							>
								<Text
									fontWeight="normal"
									color={currTopicId === item.id ? "white" : null}
									className="hidden lg:block"
								>
									{item.name}
									{msgMap.get(item.id) !== "0" &&
                                        <Badge ml="1" fontSize="0.9em" colorScheme="red">
											{msgMap.get(item.id)}
                                        </Badge>
									}
								</Text>
							</Button>
						</ListItem>
					))}
				</List>
			</Box>
		</Box>
	)
}